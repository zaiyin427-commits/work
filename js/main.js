import { TOPICS, DEFAULT_MONTH, MESSAGES } from "./config.js";
import { loadTopicData } from "./dataLoader.js";
import { createMap, createSiteLayer } from "./mapView.js";
import { initMonthSlider } from "./monthSlider.js";
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

const showError = (error) => {
  const text = getErrorText(error);
  console.error(text, error.cause ?? error);
  const element = document.getElementById("error-message");
  element.textContent = text;
  element.hidden = false;
};

const loadData = async () => {
  try {
    return await loadTopicData(TOPICS[0]);
  } catch (error) {
    throw new StartupError(`${MESSAGES.loadFailed} ${error.message}`, {
      cause: error,
    });
  }
};

const start = async () => {
  if (typeof L === "undefined") {
    throw new StartupError(MESSAGES.mapLibraryFailed);
  }
  const data = await loadData();
  const siteLayer = createSiteLayer(createMap("map"));

  const handleSiteClick = (site, month) =>
    showSiteInfo(site, month, data.species);

  const renderMonth = (month) => {
    closeInfoPanel();
    const visibleCount = siteLayer.render(
      data.sites,
      data.species,
      month,
      handleSiteClick,
    );
    setEmptyMonthMessageVisible(visibleCount === 0);
  };

  initInfoPanel();
  initMonthSlider(DEFAULT_MONTH, renderMonth);
  renderMonth(DEFAULT_MONTH);
};

start().catch(showError);
