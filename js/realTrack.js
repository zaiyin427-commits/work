import {
  MIGRATION_ANIMATION,
  REAL_TRACK,
  MESSAGES,
  EARTH_RADIUS_KILOMETERS,
  METERS_PER_KILOMETER,
  ISO_DATE_PATTERN,
  FALLBACK_MARKER_COLOR,
} from "./config.js";
import { ensurePane, prefersReducedMotion } from "./migrationAnimation.js";

const getPointMonth = (point) => Number(ISO_DATE_PATTERN.exec(point[0])[2]);

const toLatLng = (point) => [point[1], point[2]];

const getMonthSegment = (track, month) => {
  const firstIndex = track.points.findIndex((point) => getPointMonth(point) === month);
  if (firstIndex === -1) {
    return [];
  }
  const inMonth = track.points.filter((point) => getPointMonth(point) === month);
  const connecting = firstIndex > 0 ? [track.points[firstIndex - 1]] : [];
  return [...connecting, ...inMonth].map(toLatLng);
};

const warnedMissingSpeciesIds = new Set();

const warnOnceAboutMissingSpecies = (speciesId) => {
  if (warnedMissingSpeciesIds.has(speciesId)) {
    return;
  }
  warnedMissingSpeciesIds.add(speciesId);
  console.warn(`${MESSAGES.trackSpeciesMissing} ${speciesId}`);
};

export const getTrackColor = (track, topicDataList, topicId) => {
  const topicData = topicDataList.find((candidate) => candidate.topic.id === topicId);
  if (topicData === undefined) {
    return FALLBACK_MARKER_COLOR;
  }
  const color = topicData.species[track.speciesId]?.color;
  if (color === undefined) {
    warnOnceAboutMissingSpecies(track.speciesId);
    return FALLBACK_MARKER_COLOR;
  }
  return color;
};

const toRadians = (degrees) => (degrees * Math.PI) / 180;

const getGreatCircleKilometers = (from, to) => {
  const latitudeDelta = toRadians(to[0] - from[0]);
  const longitudeDelta = toRadians(to[1] - from[1]);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from[0])) * Math.cos(toRadians(to[0])) * Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KILOMETERS * Math.asin(Math.sqrt(haversine));
};

const getCentroid = (points) => [
  points.reduce((sum, point) => sum + point[0], 0) / points.length,
  points.reduce((sum, point) => sum + point[1], 0) / points.length,
];

const getSpreadKilometers = (points, center) =>
  Math.max(...points.map((point) => getGreatCircleKilometers(center, point)));

const getMaxPairDistanceKilometers = (points) =>
  Math.max(
    ...points.flatMap((from, fromIndex) =>
      points.slice(fromIndex + 1).map((to) => getGreatCircleKilometers(from, to)),
    ),
  );

const isWithinStaySpread = (points) =>
  getMaxPairDistanceKilometers(points) <= REAL_TRACK.stayAreaMaxSpreadKilometers;

const getCompactRunEndIndex = (points, startIndex) => {
  let endIndex = startIndex + 1;
  while (endIndex < points.length && isWithinStaySpread(points.slice(startIndex, endIndex + 1))) {
    endIndex += 1;
  }
  return endIndex;
};

const splitIntoRuns = (points) => {
  const runs = [];
  let startIndex = 0;
  while (startIndex < points.length) {
    const compactEndIndex = getCompactRunEndIndex(points, startIndex);
    const isStay = compactEndIndex - startIndex >= REAL_TRACK.stayAreaMinimumRecords;
    const endIndex = isStay ? compactEndIndex : startIndex + 1;
    runs.push({ isStay, points: points.slice(startIndex, endIndex) });
    startIndex = endIndex;
  }
  return runs;
};

const getRoundingMarginKilometers = (precisionDegrees, latitude) => {
  const cellHeightKilometers = toRadians(precisionDegrees) * EARTH_RADIUS_KILOMETERS;
  const cellWidthKilometers = cellHeightKilometers * Math.cos(toRadians(latitude));
  return Math.hypot(cellHeightKilometers, cellWidthKilometers) / REAL_TRACK.roundingMarginDiagonalDivisor;
};

const getStayArea = (points, precisionDegrees) => {
  const center = getCentroid(points);
  const radiusKilometers = Math.max(
    getSpreadKilometers(points, center) + getRoundingMarginKilometers(precisionDegrees, center[0]),
    REAL_TRACK.stayAreaMinRadiusKilometers,
  );
  return { center, radiusKilometers };
};

const describeRun = ({ isStay, points }, precisionDegrees) => {
  if (!isStay) {
    return { stayArea: null, displayPoints: points };
  }
  const stayArea = getStayArea(points, precisionDegrees);
  return { stayArea, displayPoints: [stayArea.center] };
};

const hasEnoughDistinctPoints = (points) =>
  new Set(points.map((point) => point.join())).size >= REAL_TRACK.pathMinimumDistinctPoints;

const getMonthShapes = (track, month) => {
  const runs = splitIntoRuns(getMonthSegment(track, month)).map((run) =>
    describeRun(run, track.precisionDegrees),
  );
  const displayPath = runs.flatMap(({ displayPoints }) => displayPoints);
  return {
    stayAreas: runs.map(({ stayArea }) => stayArea).filter((stayArea) => stayArea !== null),
    path: hasEnoughDistinctPoints(displayPath) ? displayPath : null,
  };
};

const getDistance = (from, to) => Math.hypot(to[0] - from[0], to[1] - from[1]);

const getPointAlongPath = (points, ratio) => {
  const lengths = points.slice(1).map((point, index) => getDistance(points[index], point));
  const total = lengths.reduce((sum, length) => sum + length, 0);
  let remaining = ratio * total;
  for (let index = 0; index < lengths.length; index += 1) {
    if (remaining <= lengths[index] || index === lengths.length - 1) {
      const fraction = lengths[index] === 0 ? 0 : Math.min(remaining / lengths[index], 1);
      return points[index].map(
        (value, axis) => value + (points[index + 1][axis] - value) * fraction,
      );
    }
    remaining -= lengths[index];
  }
  return points[0];
};

const createPath = (points, color) =>
  L.polyline(points, {
    color,
    weight: REAL_TRACK.pathWeight,
    opacity: REAL_TRACK.pathOpacity,
    className: REAL_TRACK.pathClassName,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const createStayArea = ({ center, radiusKilometers }, color) =>
  L.circle(center, {
    radius: radiusKilometers * METERS_PER_KILOMETER,
    color,
    weight: REAL_TRACK.stayAreaStrokeWeight,
    opacity: REAL_TRACK.stayAreaStrokeOpacity,
    fillColor: color,
    fillOpacity: REAL_TRACK.stayAreaFillOpacity,
    className: REAL_TRACK.stayAreaClassName,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const createDot = (startPoint, color) =>
  L.circleMarker(startPoint, {
    radius: REAL_TRACK.dotRadius,
    stroke: true,
    color: REAL_TRACK.dotStrokeColor,
    weight: REAL_TRACK.dotStrokeWeight,
    fillColor: color,
    fillOpacity: REAL_TRACK.dotFillOpacity,
    className: REAL_TRACK.dotClassName,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

export const createRealTrack = (map, tracks) => {
  ensurePane(map);
  const layer = L.layerGroup().addTo(map);
  let segments = [];
  let frameId = null;

  const clear = () => {
    cancelAnimationFrame(frameId);
    frameId = null;
    segments = [];
    layer.clearLayers();
  };

  const collectSegments = (loadedTopics, month) =>
    tracks
      .filter(({ topicId }) => loadedTopics.some((topicData) => topicData.topic.id === topicId))
      .map(({ topicId, data }) => ({
        ...getMonthShapes(data, month),
        color: getTrackColor(data, loadedTopics, topicId),
      }));

  const draw = (loadedTopics, month) => {
    clear();
    segments = collectSegments(loadedTopics, month);
    segments.forEach(({ stayAreas, path, color }) => {
      stayAreas.forEach((stayArea) => createStayArea(stayArea, color).addTo(layer));
      if (path !== null) {
        createPath(path, color).addTo(layer);
      }
    });
  };

  const animate = () => {
    const movingSegments = segments.filter(({ path }) => path !== null);
    if (movingSegments.length === 0 || prefersReducedMotion()) {
      return;
    }
    const dots = movingSegments.map(({ path, color }) => ({
      path,
      dot: createDot(path[0], color).addTo(layer),
    }));
    const startTime = performance.now();
    const step = (now) => {
      const ratio = (now - startTime) / MIGRATION_ANIMATION.durationMilliseconds;
      if (ratio >= 1) {
        dots.forEach(({ dot }) => layer.removeLayer(dot));
        frameId = null;
        return;
      }
      dots.forEach(({ path, dot }) => dot.setLatLng(getPointAlongPath(path, ratio)));
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
  };

  return { draw, animate };
};
