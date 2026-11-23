import { MIGRATION_ANIMATION, MONTH_MIN, MONTH_MAX, FALLBACK_MARKER_COLOR } from "./config.js";
import { getObservationsInMonth } from "./mapView.js";

const getPreviousMonth = (month) => (month === MONTH_MIN ? MONTH_MAX : month - 1);

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const getControlPoint = (start, end) => {
  const [startLat, startLng] = start;
  const [endLat, endLng] = end;
  const deltaLat = endLat - startLat;
  const deltaLng = endLng - startLng;
  return [
    (startLat + endLat) / 2 - deltaLng * MIGRATION_ANIMATION.curveBend,
    (startLng + endLng) / 2 + deltaLat * MIGRATION_ANIMATION.curveBend,
  ];
};

const getBezierPoint = (start, control, end, ratio) => {
  const remaining = 1 - ratio;
  return start.map(
    (value, axis) =>
      remaining * remaining * value +
      2 * remaining * ratio * control[axis] +
      ratio * ratio * end[axis],
  );
};

const sampleCurve = (start, control, end) => {
  const lastIndex = MIGRATION_ANIMATION.pathPointCount - 1;
  return Array.from({ length: MIGRATION_ANIMATION.pathPointCount }, (_, index) =>
    getBezierPoint(start, control, end, index / lastIndex),
  );
};

const collectLegsForSite = (site, topicData, month) => {
  const previousMonth = getPreviousMonth(month);
  const toLeg = (observation, direction) => {
    const species = topicData.species[observation.species];
    if (!species.breedingArea) {
      return null;
    }
    const breedingPoint = [species.breedingArea.lat, species.breedingArea.lng];
    const sitePoint = [site.lat, site.lng];
    const isArriving = direction === "arriving";
    return {
      direction,
      color: species.color ?? FALLBACK_MARKER_COLOR,
      start: isArriving ? breedingPoint : sitePoint,
      end: isArriving ? sitePoint : breedingPoint,
    };
  };
  const arriving = getObservationsInMonth(site, month)
    .filter((observation) => !observation.months.includes(previousMonth))
    .map((observation) => toLeg(observation, "arriving"));
  const departing = getObservationsInMonth(site, previousMonth)
    .filter((observation) => !observation.months.includes(month))
    .map((observation) => toLeg(observation, "departing"));
  return [...arriving, ...departing].filter(Boolean);
};

const collectLegs = (topicDataList, month) =>
  topicDataList.flatMap((topicData) =>
    topicData.sites.flatMap((site) => collectLegsForSite(site, topicData, month)),
  );

const createPath = (leg, points) =>
  L.polyline(points, {
    color: leg.color,
    weight: MIGRATION_ANIMATION.pathWeight,
    dashArray: MIGRATION_ANIMATION.pathDashArray,
    className: `migration-path migration-path--${leg.direction}`,
    opacity: MIGRATION_ANIMATION.pathOpacity,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const createDot = (leg, startPoint) =>
  L.circleMarker(startPoint, {
    radius: MIGRATION_ANIMATION.dotRadius,
    stroke: true,
    color: MIGRATION_ANIMATION.dotStrokeColor,
    weight: MIGRATION_ANIMATION.dotStrokeWeight,
    fillColor: leg.color,
    fillOpacity: MIGRATION_ANIMATION.dotFillOpacity,
    className: "migration-dot",
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const getDotRatio = (elapsed, dotIndex) => {
  const { durationMilliseconds, dotCount, startStaggerRatio } = MIGRATION_ANIMATION;
  const staggerTotal = durationMilliseconds * startStaggerRatio;
  const travelTime = durationMilliseconds - staggerTotal;
  const delay = dotCount > 1 ? (staggerTotal * dotIndex) / (dotCount - 1) : 0;
  return Math.min(Math.max((elapsed - delay) / travelTime, 0), 1);
};

const ensurePane = (map) => {
  const { paneName, paneZIndex } = MIGRATION_ANIMATION;
  const pane = map.getPane(paneName) ?? map.createPane(paneName);
  pane.style.zIndex = paneZIndex;
  pane.style.pointerEvents = "none";
};

export const createMigrationAnimation = (map) => {
  ensurePane(map);
  const layer = L.layerGroup().addTo(map);
  let frameId = null;

  const clear = () => {
    cancelAnimationFrame(frameId);
    frameId = null;
    layer.clearLayers();
  };

  const startDots = (legsWithPoints) => {
    const dots = legsWithPoints.flatMap(({ leg, control }) =>
      Array.from({ length: MIGRATION_ANIMATION.dotCount }, (_, dotIndex) => ({
        dot: createDot(leg, leg.start).addTo(layer),
        leg,
        control,
        dotIndex,
      })),
    );
    const startTime = performance.now();

    const step = (now) => {
      const elapsed = now - startTime;
      if (elapsed >= MIGRATION_ANIMATION.durationMilliseconds) {
        dots.forEach(({ dot }) => layer.removeLayer(dot));
        frameId = null;
        return;
      }
      dots.forEach(({ dot, leg, control, dotIndex }) => {
        dot.setLatLng(getBezierPoint(leg.start, control, leg.end, getDotRatio(elapsed, dotIndex)));
      });
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
  };

  const play = (topicDataList, month) => {
    clear();
    const legsWithPoints = collectLegs(topicDataList, month).map((leg) => {
      const control = getControlPoint(leg.start, leg.end);
      return { leg, control, points: sampleCurve(leg.start, control, leg.end) };
    });
    legsWithPoints.forEach(({ leg, points }) => createPath(leg, points).addTo(layer));
    if (legsWithPoints.length > 0 && !prefersReducedMotion()) {
      startDots(legsWithPoints);
    }
  };

  return { play, clear };
};
