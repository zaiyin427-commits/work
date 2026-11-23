import { MESSAGES } from "./config.js";
import { getObservationsInMonth } from "./mapView.js";

const panel = () => document.getElementById("info-panel");

const createParagraph = (text, className) => {
  const paragraph = document.createElement("p");
  paragraph.textContent = text;
  if (className) {
    paragraph.className = className;
  }
  return paragraph;
};

const createSpeciesEntry = (species) => {
  const entry = document.createElement("section");
  entry.className = "species-entry";
  entry.style.borderLeftColor = species.color;

  const heading = document.createElement("h3");
  heading.textContent = species.name;

  const tips = document.createElement("p");
  const tipsLabel = document.createElement("span");
  tipsLabel.className = "species-tips-label";
  tipsLabel.textContent = `${MESSAGES.tipsLabel}: `;
  tips.append(tipsLabel, species.tips);

  entry.append(heading, createParagraph(species.description), tips);
  return entry;
};

export const closeInfoPanel = () => {
  panel().hidden = true;
};

export const showSiteInfo = (site, month, topicData) => {
  const body = document.getElementById("info-panel-body");
  document.getElementById("info-panel-title").textContent = site.name;
  document.getElementById("info-panel-topic").textContent =
    topicData.topic.title;
  const entries = getObservationsInMonth(site, month)
    .map((observation) => topicData.species[observation.species])
    .map(createSpeciesEntry);
  body.replaceChildren(...entries);
  panel().hidden = false;
};

export const setEmptyMonthMessageVisible = (isVisible) => {
  document.getElementById("empty-month-message").hidden = !isVisible;
};

export const initInfoPanel = () => {
  document
    .getElementById("info-panel-close")
    .addEventListener("click", closeInfoPanel);
};
