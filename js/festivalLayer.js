import { CALENDAR, FESTIVAL, FESTIVAL_STATUS, MESSAGES } from "./config.js";
import { parseIsoDate, getDaysBetween, formatMonthDayText } from "./dateUtils.js";

const STATUS_LABELS = {
  [FESTIVAL_STATUS.ongoing]: MESSAGES.festivalStatusOngoing,
  [FESTIVAL_STATUS.upcoming]: MESSAGES.festivalStatusUpcoming,
  [FESTIVAL_STATUS.recentlyEnded]: MESSAGES.festivalStatusRecentlyEnded,
};

export const parseFestival = (festival) => ({
  ...festival,
  start: parseIsoDate(festival.startDate),
  end: parseIsoDate(festival.endDate),
});

export const getFestivalStatus = (festival, selectedDate) => {
  const daysUntilStart = getDaysBetween(selectedDate, festival.start);
  const daysUntilEnd = getDaysBetween(selectedDate, festival.end);
  if (daysUntilStart <= 0 && daysUntilEnd >= 0) {
    return { status: FESTIVAL_STATUS.ongoing, daysUntilStart, daysUntilEnd };
  }
  if (daysUntilStart > 0 && daysUntilStart <= FESTIVAL.upcomingWindowDays) {
    return { status: FESTIVAL_STATUS.upcoming, daysUntilStart, daysUntilEnd };
  }
  if (daysUntilEnd < 0 && -daysUntilEnd <= FESTIVAL.recentlyEndedWindowDays) {
    return { status: FESTIVAL_STATUS.recentlyEnded, daysUntilStart, daysUntilEnd };
  }
  return null;
};

const formatPeriodDate = (festival, date) =>
  festival.start.getFullYear() === festival.end.getFullYear()
    ? formatMonthDayText(date)
    : `${date.getFullYear()}${MESSAGES.yearSuffix} ${formatMonthDayText(date)}`;

export const formatPeriod = (festival) =>
  festival.start.getTime() === festival.end.getTime()
    ? formatPeriodDate(festival, festival.start)
    : `${formatPeriodDate(festival, festival.start)}${MESSAGES.festivalPeriodSeparator}${formatPeriodDate(festival, festival.end)}`;

export const createTextElement = (tagName, text, className) => {
  const element = document.createElement(tagName);
  element.textContent = text;
  if (className !== undefined) {
    element.className = className;
  }
  return element;
};

const appendOngoingStatus = (line, daysUntilEnd) => {
  const endText =
    daysUntilEnd === 0
      ? MESSAGES.festivalEndsToday
      : `${MESSAGES.festivalEndsInPrefix}${daysUntilEnd}${MESSAGES.daySuffix}`;
  line.append(`${MESSAGES.festivalStatusOngoing}${MESSAGES.festivalStatusSeparator}${endText}`);
  if (daysUntilEnd > 0 && daysUntilEnd <= FESTIVAL.endingSoonDays) {
    line.append(
      MESSAGES.festivalStatusSeparator,
      createTextElement("strong", MESSAGES.festivalEndingSoon, `${FESTIVAL.classPrefix}-popup__ending-soon`),
    );
  }
};

const createStatusLine = ({ status, daysUntilStart, daysUntilEnd }) => {
  const line = createTextElement("p", "", `${FESTIVAL.classPrefix}-popup__status`);
  if (status === FESTIVAL_STATUS.ongoing) {
    appendOngoingStatus(line, daysUntilEnd);
  } else if (status === FESTIVAL_STATUS.upcoming) {
    line.textContent = `${MESSAGES.festivalDDayPrefix}${daysUntilStart}`;
  } else {
    line.textContent = `${-daysUntilEnd}${MESSAGES.festivalEndedAgoSuffix}`;
  }
  return line;
};

const createPopupContent = (festival, statusInfo) => {
  const content = document.createElement("div");
  content.className = `${FESTIVAL.classPrefix}-popup`;
  content.append(
    createTextElement("h3", festival.title, `${FESTIVAL.classPrefix}-popup__title`),
    createTextElement("p", formatPeriod(festival)),
    createTextElement("p", festival.address),
    createStatusLine(statusInfo),
    createTextElement("p", MESSAGES.festivalSourceLine, `${FESTIVAL.classPrefix}-popup__source`),
  );
  return content;
};

const createBadge = (festival, status) => {
  const badge = document.createElement("div");
  badge.className = `${FESTIVAL.classPrefix}__badge`;
  badge.textContent = MESSAGES.festivalMarkerGlyph;
  badge.setAttribute("role", "img");
  badge.setAttribute(
    "aria-label",
    `${festival.title}${MESSAGES.festivalLabelSeparator}${STATUS_LABELS[status]}`,
  );
  return badge;
};

const getPopupPadding = () => {
  const toggleBottom = document.getElementById("festival-toggle").getBoundingClientRect().bottom;
  const sideColumnWidth = document.getElementById("side-column").getBoundingClientRect().width;
  const compactLayout = window.matchMedia(CALENDAR.compactMediaQuery).matches;
  const rightPadding = compactLayout ? FESTIVAL.popupGap : sideColumnWidth + 2 * FESTIVAL.popupGap;
  return {
    topLeft: L.point(FESTIVAL.popupGap, toggleBottom + FESTIVAL.popupGap),
    bottomRight: L.point(rightPadding, FESTIVAL.popupGap),
  };
};

const createFestivalMarker = (festival, statusInfo) => {
  const modifier = statusInfo.status === FESTIVAL_STATUS.ongoing ? "ongoing" : "nearby";
  const icon = L.divIcon({
    className: `${FESTIVAL.classPrefix} ${FESTIVAL.classPrefix}--${modifier}`,
    html: createBadge(festival, statusInfo.status),
    iconSize: [FESTIVAL.markerSize, FESTIVAL.markerSize],
    iconAnchor: [FESTIVAL.markerAnchor, FESTIVAL.markerAnchor],
  });
  const marker = L.marker([festival.lat, festival.lng], {
    icon,
    keyboard: true,
    zIndexOffset: FESTIVAL.zIndexOffset,
  });
  marker.bindTooltip(document.createTextNode(festival.title));
  const popup = L.popup();
  popup.setContent(createPopupContent(festival, statusInfo));
  marker.on("click", () => {
    const padding = getPopupPadding();
    popup.options.autoPanPaddingTopLeft = padding.topLeft;
    popup.options.autoPanPaddingBottomRight = padding.bottomRight;
  });
  marker.bindPopup(popup);
  return marker;
};

export const createFestivalLayer = (map, festivals) => {
  const parsedFestivals = festivals.map(parseFestival);
  const layer = L.layerGroup();

  const render = (selectedDate) => {
    layer.clearLayers();
    parsedFestivals.forEach((festival) => {
      const statusInfo = getFestivalStatus(festival, selectedDate);
      if (statusInfo !== null) {
        createFestivalMarker(festival, statusInfo).addTo(layer);
      }
    });
  };

  const setShown = (shown) => {
    if (shown) {
      layer.addTo(map);
    } else {
      layer.remove();
    }
  };

  return { render, setShown };
};

export const initFestivalToggle = (onChange) => {
  const container = document.getElementById("festival-toggle");
  const checkbox = document.getElementById("festival-toggle-input");
  checkbox.checked = FESTIVAL.showByDefault;
  checkbox.addEventListener("change", () => onChange(checkbox.checked));
  container.hidden = false;
  return checkbox.checked;
};
