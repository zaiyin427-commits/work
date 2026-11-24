import {
  MAP_LEGEND,
  MESSAGES,
  DOI_URL_PREFIX,
  DOI_BARE_PATTERN,
  HTTP_URL_PATTERN,
} from "./config.js";
import { getTrackColor } from "./realTrack.js";

const getDoiUrl = (doi) => {
  const url = DOI_BARE_PATTERN.test(doi) ? `${DOI_URL_PREFIX}${doi}` : doi;
  if (!HTTP_URL_PATTERN.test(url)) {
    console.warn(`${MESSAGES.trackDoiInvalid} ${doi}`);
    return null;
  }
  return url;
};

const getLicenseUrl = (licenseUrl) => {
  if (!HTTP_URL_PATTERN.test(licenseUrl)) {
    console.warn(`${MESSAGES.trackLicenseUrlInvalid} ${licenseUrl}`);
    return null;
  }
  return licenseUrl;
};

const createExternalLink = (url, text) => {
  const link = document.createElement("a");
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener";
  link.textContent = text;
  return link;
};

const createLinkOrText = (url, text) =>
  url === null ? document.createTextNode(text) : createExternalLink(url, text);

const formatSeason = (season) => season.replace("-", MESSAGES.legendSeasonSeparator);

const formatRealTrackLabel = (track) =>
  `${MESSAGES.legendRealTrackPrefix}${track.speciesName} ${MESSAGES.legendRealTrackCount} ` +
  `(${track.individualName}, ${formatSeason(track.season)})`;

const formatModificationNote = (track) =>
  `${MESSAGES.legendModificationPrefix}${track.precisionDegrees}${MESSAGES.legendModificationSuffix}`;

const fillSource = (sourceElement, track) => {
  const { source } = track;
  sourceElement.replaceChildren(
    createLinkOrText(getDoiUrl(source.doi), `${MESSAGES.legendSourcePrefix}${source.name}`),
    document.createTextNode(" ("),
    createLinkOrText(getLicenseUrl(source.licenseUrl), source.license),
    document.createTextNode(`) ${MESSAGES.legendSourceSeparator} ${formatModificationNote(track)}`),
  );
};

export const initMapLegend = (tracks, topicDataList) => {
  const legend = document.getElementById("map-legend");
  const realRow = document.getElementById("legend-real-track");
  const sourceElement = document.getElementById("legend-source");
  document.getElementById("legend-estimated-text").textContent = MESSAGES.legendEstimated;
  const [firstTrack] = tracks;
  realRow.hidden = firstTrack === undefined;
  sourceElement.hidden = firstTrack === undefined;
  if (tracks.length > 1) {
    console.warn(MESSAGES.legendMultipleTracks);
  }
  if (firstTrack !== undefined) {
    const { data, topicId } = firstTrack;
    document.getElementById("legend-real-track-text").textContent = formatRealTrackLabel(data);
    realRow.style.setProperty(
      MAP_LEGEND.swatchColorProperty,
      getTrackColor(data, topicDataList, topicId),
    );
    fillSource(sourceElement, data);
  }
  legend.hidden = !topicDataList.some((topicData) => topicData.topic.id === MAP_LEGEND.topicId);
};
