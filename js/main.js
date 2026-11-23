import {
  TOPICS,
  TOPIC_ENABLED_BY_DEFAULT,
  DEFAULT_MONTH,
  MESSAGES,
} from "./config.js";
import { loadTopicData } from "./dataLoader.js";
import { createMap, createSiteLayer } from "./mapView.js";
import { initMonthSlider } from "./monthSlider.js";
import { initPlayControl } from "./playControl.js";
import { createMigrationAnimation } from "./migrationAnimation.js";
import { initTopicFilter } from "./topicFilter.js";
import {
  initInfoPanel,
  showSiteInfo,
  closeInfoPanel,
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
  failures.forEach(({ topic, error }) =>
    console.error(`${MESSAGES.loadFailed} ${topic.dataFile}`, error),
  );
  const failedFiles = failures.map(({ topic }) => topic.dataFile).join(", ");
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

const loadAllTopics = async () => {
  const results = await Promise.allSettled(
    TOPICS.map((topic) => loadTopicWithIdCheck(topic)),
  );
  const loaded = [];
  const failures = [];
  results.forEach((result, index) => {
    if (result.status === "fulfilled") {
      loaded.push(result.value);
    } else {
      failures.push({ topic: TOPICS[index], error: result.reason });
    }
  });
  return { loaded, failures };
};

const getDefaultEnabledTopicIds = (loadedTopics) =>
  TOPIC_ENABLED_BY_DEFAULT
    ? new Set(loadedTopics.map((topicData) => topicData.topic.id))
    : new Set();

const start = async () => {
  if (typeof L === "undefined") {
    throw new StartupError(MESSAGES.mapLibraryFailed);
  }
  const { loaded, failures } = await loadAllTopics();
  if (failures.length > 0) {
    reportLoadFailures(failures);
  }
  if (loaded.length === 0) {
    return;
  }
  const map = createMap("map");
  const siteLayer = createSiteLayer(map);
  const migrationAnimation = createMigrationAnimation(map);
  let enabledTopicIds = getDefaultEnabledTopicIds(loaded);
  let selectedMonth = DEFAULT_MONTH;

  const getEnabledTopics = () =>
    loaded.filter((topicData) => enabledTopicIds.has(topicData.topic.id));

  const render = () => {
    closeInfoPanel();
    migrationAnimation.clear();
    const enabledTopics = getEnabledTopics();
    const visibleCount = siteLayer.render(
      enabledTopics,
      selectedMonth,
      showSiteInfo,
    );
    setEmptyMonthMessageVisible(visibleCount === 0);
  };

  initInfoPanel();
  initTopicFilter(loaded, enabledTopicIds, (changedTopicIds) => {
    enabledTopicIds = changedTopicIds;
    render();
  });
  const playControl = initPlayControl(
    () => selectedMonth,
    (month) => monthSlider.setMonth(month),
  );
  const monthSlider = initMonthSlider(
    DEFAULT_MONTH,
    (month) => {
      selectedMonth = month;
      render();
      migrationAnimation.play(getEnabledTopics(), month);
    },
    playControl.stop,
  );
  render();
};

start().catch(showError);
