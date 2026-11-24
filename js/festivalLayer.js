import { FESTIVAL, FESTIVAL_STATUS, MESSAGES } from "./config.js";
import { formatMonthDayText } from "./dateUtils.js";
import {
  parseFestival,
  overlapsYear,
  getFestivalState,
  isEndingSoon,
  formatStatusText,
} from "./festivalStatus.js";

const STATUS_LABELS = {
  [FESTIVAL_STATUS.ongoing]: MESSAGES.festivalStatusOngoing,
  [FESTIVAL_STATUS.upcoming]: MESSAGES.festivalStatusUpcoming,
  [FESTIVAL_STATUS.recentlyEnded]: MESSAGES.festivalStatusRecentlyEnded,
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

export const createStatusLine = (tagName, state, className) => {
  const line = createTextElement(tagName, formatStatusText(state), className);
  if (isEndingSoon(state)) {
    line.append(
      MESSAGES.festivalStatusSeparator,
      createTextElement("strong", MESSAGES.festivalEndingSoon, `${FESTIVAL.classPrefix}-status__ending-soon`),
    );
  }
  return line;
};

const createPopupContent = (festival, state) => {
  const content = document.createElement("div");
  content.className = `${FESTIVAL.classPrefix}-popup`;
  content.append(
    createTextElement("h3", festival.title, `${FESTIVAL.classPrefix}-popup__title`),
    createTextElement("p", formatPeriod(festival)),
    createTextElement("p", festival.address),
    createStatusLine("p", state, `${FESTIVAL.classPrefix}-popup__status`),
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

const createLazyPoint = (getPoint) => ({
  get x() {
    return getPoint().x;
  },
  get y() {
    return getPoint().y;
  },
});

const bindFestivalPopup = (layer, festival, state, getPopupPadding) => {
  layer.bindTooltip(document.createTextNode(festival.title));
  const popup = L.popup({
    maxWidth: FESTIVAL.popupMaxWidth,
    autoPanPaddingTopLeft: createLazyPoint(() => getPopupPadding().topLeft),
    autoPanPaddingBottomRight: createLazyPoint(() => getPopupPadding().bottomRight),
  });
  popup.setContent(createPopupContent(festival, state));
  layer.bindPopup(popup);
};

const createFestivalMarker = (festival, state, getPopupPadding) => {
  const modifier = state.nearStatus === FESTIVAL_STATUS.ongoing ? "ongoing" : "nearby";
  const icon = L.divIcon({
    className: `${FESTIVAL.classPrefix} ${FESTIVAL.classPrefix}--${modifier}`,
    html: createBadge(festival, state.nearStatus),
    iconSize: [FESTIVAL.markerSize, FESTIVAL.markerSize],
    iconAnchor: [FESTIVAL.markerAnchor, FESTIVAL.markerAnchor],
  });
  const marker = L.marker([festival.lat, festival.lng], {
    icon,
    keyboard: true,
    zIndexOffset: FESTIVAL.zIndexOffset,
  });
  bindFestivalPopup(marker, festival, state, getPopupPadding);
  return marker;
};

const prefersReducedMotion = () => window.matchMedia(FESTIVAL.reducedMotionQuery).matches;

const makeDotFocusable = (map, dot, festival, getPopupPadding) => {
  dot.on("add", () => {
    const element = dot.getElement();
    element.setAttribute("tabindex", "0");
    element.setAttribute("role", "button");
    element.setAttribute("aria-label", festival.title);
    element.addEventListener("focus", () =>
      map.panInside(dot.getLatLng(), {
        animate: !prefersReducedMotion(),
        paddingTopLeft: getPopupPadding().topLeft,
        paddingBottomRight: getPopupPadding().bottomRight,
      }),
    );
    element.addEventListener("keydown", (event) => {
      if (event.key === FESTIVAL.activationKey) {
        dot.openPopup();
      }
    });
  });
};

const createFestivalDot = (map, festival, state, getPopupPadding) => {
  const dot = L.circleMarker([festival.lat, festival.lng], {
    radius: FESTIVAL.dotRadius,
    weight: FESTIVAL.dotWeight,
    color: FESTIVAL.dotBorderColor,
    fillColor: FESTIVAL.dotColor,
    fillOpacity: FESTIVAL.dotFillOpacity,
    className: FESTIVAL.dotClassName,
  });
  bindFestivalPopup(dot, festival, state, getPopupPadding);
  makeDotFocusable(map, dot, festival, getPopupPadding);
  return dot;
};

export const createFestivalLayer = (map, festivals, { getPopupPadding }) => {
  const parsedFestivals = festivals.map(parseFestival);
  const badgeLayer = L.layerGroup();
  const dotLayer = L.layerGroup();
  const badgeMarkers = new Map();
  let selectedDate = null;
  let dotsVisible = false;
  let pendingArrival = null;

  const isDotZoom = () => map.getZoom() >= FESTIVAL.dotMinimumZoom;

  const cancelPendingArrival = () => {
    if (pendingArrival !== null) {
      map.off("moveend", pendingArrival);
      pendingArrival = null;
    }
  };

  const renderBadges = () => {
    badgeLayer.clearLayers();
    badgeMarkers.clear();
    parsedFestivals.forEach((festival) => {
      const state = getFestivalState(festival, selectedDate);
      if (state.nearStatus !== null) {
        const marker = createFestivalMarker(festival, state, getPopupPadding).addTo(badgeLayer);
        badgeMarkers.set(festival.id, marker);
      }
    });
  };

  const renderDots = () => {
    dotLayer.clearLayers();
    dotsVisible = isDotZoom();
    if (!dotsVisible) {
      return;
    }
    parsedFestivals.forEach((festival) => {
      const state = getFestivalState(festival, selectedDate);
      if (state.nearStatus === null && overlapsYear(festival, selectedDate.getFullYear())) {
        createFestivalDot(map, festival, state, getPopupPadding).addTo(dotLayer);
      }
    });
  };

  const render = (date) => {
    cancelPendingArrival();
    selectedDate = date;
    renderBadges();
    renderDots();
  };

  const hasArrived = (latlng, zoom) =>
    map.getZoom() === zoom &&
    map.latLngToContainerPoint(latlng).distanceTo(map.getSize().divideBy(2)) <=
      FESTIVAL.arrivalTolerancePixels;

  const moveMap = (latlng, zoom, onArrive) => {
    cancelPendingArrival();
    if (hasArrived(latlng, zoom)) {
      onArrive();
      return;
    }
    pendingArrival = () => {
      cancelPendingArrival();
      if (!hasArrived(latlng, zoom)) {
        map.setView(latlng, zoom, { animate: false });
      }
      onArrive();
    };
    map.on("moveend", pendingArrival);
    map.setView(latlng, zoom, { animate: !prefersReducedMotion() });
  };

  const focusFestival = (festivalId) => {
    const marker = badgeMarkers.get(festivalId);
    if (marker === undefined) {
      return;
    }
    moveMap(marker.getLatLng(), Math.max(map.getZoom(), FESTIVAL.focusZoom), () => {
      if (badgeLayer.hasLayer(marker)) {
        marker.openPopup();
      }
    });
  };

  map.on("zoomend", () => {
    if (selectedDate !== null && dotsVisible !== isDotZoom()) {
      renderDots();
    }
  });
  badgeLayer.addTo(map);
  dotLayer.addTo(map);

  return { render, focusFestival };
};
