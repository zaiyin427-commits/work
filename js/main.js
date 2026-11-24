import {
  TOPICS,
  getToday,
  MESSAGES,
  SEASON_OBSERVATIONS_FILE,
} from "./config.js";
import { loadTopicData, loadSeasonObservations } from "./dataLoader.js";
import { createMap, createSiteLayer } from "./mapView.js";
import { initDateCalendar } from "./dateCalendar.js";
import { initPlayControl } from "./playControl.js";
import {
  initInfoPanel,
  showSiteInfo,
  closeInfoPanel,
  refreshSiteInfo,
  setEmptyMonthMessageVisible,
} from "./infoPanel.js";

class StartupError extends Error {}

const getErrorText = (error) =>
  error instanceof StartupError
    ? error.message
    : `${MESSAGES.startFailed} ${error.message}`;

const displayErrorText = (text) => {
  const element = document.getElementById("error-message");
  element.textContent = text;
  element.hidden = false;
};

const showError = (error) => {
  const text = getErrorText(error);
  console.error(text, error.cause ?? error);
  displayErrorText(text);
};

const reportLoadFailures = (failures) => {
  failures.forEach(({ file, error }) =>
    console.error(`${MESSAGES.loadFailed} ${file}`, error),
  );
  const failedFiles = failures.map(({ file }) => file).join(", ");
  displayErrorText(`${MESSAGES.loadFailed} ${failedFiles}`);
};

const loadTopicWithIdCheck = async (topic) => {
  const data = await loadTopicData(topic);
  if (data.topic.id !== topic.id) {
    throw new Error(
      `${topic.dataFile}의 topic.id "${data.topic.id}"가 설정의 id "${topic.id}"와 다릅니다.`,
    );
  }
  return data;
};

const loadAllSettled = async (entries, loadEntry) => {
  const results = await Promise.allSettled(entries.map(loadEntry));
  const loaded = [];
  const failures = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      loaded.push(result.value);
    } else {
      failures.push({ file: entries[index].dataFile, error: result.reason });
    }
  });
  return { loaded, failures };
};

const loadAllTopics = () => loadAllSettled(TOPICS, loadTopicWithIdCheck);

const loadObservationsOrReport = async () => {
  try {
    return { observations: await loadSeasonObservations(SEASON_OBSERVATIONS_FILE), failure: null };
  } catch (error) {
    return { observations: null, failure: { file: SEASON_OBSERVATIONS_FILE, error } };
  }
};

const start = async () => {
  if (typeof L === "undefined") {
    throw new StartupError(MESSAGES.mapLibraryFailed);
  }
  const [{ loaded, failures: topicFailures }, observationsResult] = await Promise.all([
    loadAllTopics(),
    loadObservationsOrReport(),
  ]);
  const { observations } = observationsResult;
  const failures = [
    ...topicFailures,
    ...(observationsResult.failure ? [observationsResult.failure] : []),
  ];
  if (failures.length > 0) {
    reportLoadFailures(failures);
  }
  if (loaded.length === 0) {
    return;
  }
  const map = createMap("map");
  const siteLayer = createSiteLayer(map);
  let selectedDate = getToday();
  const getSelectedMonth = () => selectedDate.getMonth() + 1;

  const render = () => {
    closeInfoPanel();
    const visibleCount = siteLayer.render(
      loaded,
      getSelectedMonth(),
      (site, month, topicData) => {
        dateCalendar.collapseIfCompact();
        showSiteInfo(site, month, topicData, observations, selectedDate);
      },
    );
    setEmptyMonthMessageVisible(visibleCount === 0);
  };

  initInfoPanel();
  const playControl = initPlayControl(
    () => selectedDate,
    (date) => dateCalendar.setDate(date),
  );
  const dateCalendar = initDateCalendar(selectedDate, {
    onChange: (date) => {
      const monthChanged = date.getMonth() !== selectedDate.getMonth();
      selectedDate = date;
      if (monthChanged) {
        render();
      } else {
        refreshSiteInfo(selectedDate);
      }
    },
    onUserInput: playControl.stop,
    onExpand: closeInfoPanel,
  });
  map.on("click", dateCalendar.collapseIfCompact);
  render();
};

start().catch(showError);
