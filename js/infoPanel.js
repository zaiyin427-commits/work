import { MESSAGES, SEASON_STATUS, SEASON_STATUS_LABELS } from "./config.js";
import {
  getSeasonStatus,
  formatMonthDay,
  mergeObservedEvents,
  sortEventsByDate,
} from "./seasonStatus.js";
import { getObservationsInMonth } from "./mapView.js";
import { formatMonthDayText } from "./dateUtils.js";

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

const formatEvents = (events) =>
  events
    .map((event) => `${event.name} ${formatMonthDay(event.date)}`)
    .join(MESSAGES.seasonEventSeparator);

const getObservedEvents = (site, topicData, observations) =>
  observations?.sites[`${topicData.topic.id}/${site.id}`] ?? null;

const createSeasonLine = (label, text) => createParagraph(`${label}: ${text}`);

const getStatusLabel = (status, events) =>
  status === SEASON_STATUS.before
    ? `${sortEventsByDate(events)[0].name}${MESSAGES.seasonBeforeSuffix}`
    : SEASON_STATUS_LABELS[status];

const getBasisText = (year, observedCount, normalCount) => {
  if (observedCount === 0) {
    return MESSAGES.seasonNormalBasis;
  }
  const suffix =
    observedCount === normalCount
      ? MESSAGES.seasonObservedBasisSuffix
      : MESSAGES.seasonPartialObservedBasisSuffix;
  return `${year}${suffix}`;
};

const formatDateBasisLabel = (date) =>
  `${formatMonthDayText(date)}${MESSAGES.seasonDateBasisSuffix}`;

const createStatusLine = (seasonalNormal, observedEvents, observations, selectedDate) => {
  const isObservationYear =
    observedEvents !== null && observations.year === selectedDate.getFullYear();
  const { events, observedCount } = mergeObservedEvents(
    seasonalNormal.events,
    isObservationYear ? observedEvents : [],
  );
  const basis = getBasisText(
    observations?.year,
    observedCount,
    seasonalNormal.events.length,
  );
  const status = getSeasonStatus(events, selectedDate);
  return createSeasonLine(
    formatDateBasisLabel(selectedDate),
    `${getStatusLabel(status, events)} (${basis})`,
  );
};

const createStationLine = (seasonalNormal) => {
  const proxyNote = seasonalNormal.isProxy ? ` (${MESSAGES.seasonProxyNote})` : "";
  return createSeasonLine(
    MESSAGES.seasonStationLabel,
    `${seasonalNormal.stationName}${proxyNote}`,
  );
};

const createSeasonSection = (site, topicData, observations, selectedDate) => {
  const { seasonalNormal } = site;
  const observedEvents = getObservedEvents(site, topicData, observations);
  const section = document.createElement("section");
  section.className = "season-info";
  section.append(
    createSeasonLine(MESSAGES.seasonNormalLabel, formatEvents(seasonalNormal.events)),
  );
  if (observedEvents !== null && observations.year !== null) {
    section.append(
      createSeasonLine(
        `${observations.year}${MESSAGES.seasonObservedLabelSuffix}`,
        formatEvents(observedEvents),
      ),
    );
  }
  section.append(
    createStatusLine(seasonalNormal, observedEvents, observations, selectedDate),
    createStationLine(seasonalNormal),
  );
  return section;
};

let shownSiteArguments = null;

export const closeInfoPanel = () => {
  shownSiteArguments = null;
  panel().hidden = true;
};

export const showSiteInfo = (site, month, topicData, observations, selectedDate) => {
  shownSiteArguments = { site, month, topicData, observations };
  const body = document.getElementById("info-panel-body");
  document.getElementById("info-panel-title").textContent = site.name;
  document.getElementById("info-panel-topic").textContent =
    topicData.topic.title;
  const entries = getObservationsInMonth(site, month)
    .map((observation) => topicData.species[observation.species])
    .map(createSpeciesEntry);
  const seasonSections = site.seasonalNormal
    ? [createSeasonSection(site, topicData, observations, selectedDate)]
    : [];
  body.replaceChildren(...seasonSections, ...entries);
  panel().hidden = false;
};

export const refreshSiteInfo = (selectedDate) => {
  if (shownSiteArguments === null) {
    return;
  }
  const { site, month, topicData, observations } = shownSiteArguments;
  showSiteInfo(site, month, topicData, observations, selectedDate);
};

export const setEmptyMonthMessageVisible = (isVisible) => {
  document.getElementById("empty-month-message").hidden = !isVisible;
};

export const initInfoPanel = () => {
  document
    .getElementById("info-panel-close")
    .addEventListener("click", closeInfoPanel);
};
