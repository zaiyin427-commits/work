import {
  MIGRATION_ANIMATION,
  REAL_TRACK,
  MESSAGES,
  EARTH_RADIUS_KILOMETERS,
  ISO_DATE_PATTERN,
  FALLBACK_MARKER_COLOR,
} from "./config.js";
import { ensurePane, prefersReducedMotion } from "./migrationAnimation.js";

const getPointMonth = (point) => Number(ISO_DATE_PATTERN.exec(point[0])[2]);

const getPointDateParts = (point) => {
  const [, year, month, day] = ISO_DATE_PATTERN.exec(point[0]);
  return { year: Number(year), month: Number(month), day: Number(day) };
};

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

const getKilometersPerDegree = (latitude) => {
  const latitudeKilometers = toRadians(1) * EARTH_RADIUS_KILOMETERS;
  return {
    latitude: latitudeKilometers,
    longitude: latitudeKilometers * Math.cos(toRadians(latitude)),
  };
};

const getSemiAxisKilometers = (offsetsKilometers, cellKilometers) => {
  const halfExtentKilometers = Math.max(...offsetsKilometers.map(Math.abs));
  const coveringKilometers =
    (halfExtentKilometers + cellKilometers * REAL_TRACK.roundingMarginCellFraction) *
    REAL_TRACK.ellipseCircumscribeFactor;
  return Math.max(coveringKilometers, REAL_TRACK.stayAreaMinSemiAxisKilometers);
};

const getStayArea = (points, precisionDegrees) => {
  const center = getCentroid(points);
  const kilometersPerDegree = getKilometersPerDegree(center[0]);
  const eastWestOffsets = points.map((point) => (point[1] - center[1]) * kilometersPerDegree.longitude);
  const northSouthOffsets = points.map((point) => (point[0] - center[0]) * kilometersPerDegree.latitude);
  return {
    center,
    eastWestSemiAxisKilometers: getSemiAxisKilometers(
      eastWestOffsets,
      precisionDegrees * kilometersPerDegree.longitude,
    ),
    northSouthSemiAxisKilometers: getSemiAxisKilometers(
      northSouthOffsets,
      precisionDegrees * kilometersPerDegree.latitude,
    ),
  };
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

const getEllipseOutline = ({ center, eastWestSemiAxisKilometers, northSouthSemiAxisKilometers }) => {
  const kilometersPerDegree = getKilometersPerDegree(center[0]);
  return Array.from({ length: REAL_TRACK.stayAreaEllipseVertexCount }, (_, index) => {
    const angle = (2 * Math.PI * index) / REAL_TRACK.stayAreaEllipseVertexCount;
    return [
      center[0] + (northSouthSemiAxisKilometers * Math.sin(angle)) / kilometersPerDegree.latitude,
      center[1] + (eastWestSemiAxisKilometers * Math.cos(angle)) / kilometersPerDegree.longitude,
    ];
  });
};

const createStayArea = (stayArea, color) =>
  L.polygon(getEllipseOutline(stayArea), {
    color,
    weight: REAL_TRACK.stayAreaStrokeWeight,
    opacity: REAL_TRACK.stayAreaStrokeOpacity,
    fillColor: color,
    fillOpacity: REAL_TRACK.stayAreaFillOpacity,
    className: REAL_TRACK.stayAreaClassName,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const createCircleMarker = (latLng, color, { radius, strokeWeight, className }) =>
  L.circleMarker(latLng, {
    radius,
    stroke: true,
    color: REAL_TRACK.dotStrokeColor,
    weight: strokeWeight,
    fillColor: color,
    fillOpacity: REAL_TRACK.dotFillOpacity,
    className,
    pane: MIGRATION_ANIMATION.paneName,
    interactive: false,
  });

const createDot = (startPoint, color) =>
  createCircleMarker(startPoint, color, {
    radius: REAL_TRACK.dotRadius,
    strokeWeight: REAL_TRACK.dotStrokeWeight,
    className: REAL_TRACK.dotClassName,
  });

const findDayRecord = (track, month, day) => {
  const monthPoints = track.points.filter((point) => getPointMonth(point) === month);
  const exactPoint = monthPoints.find((point) => getPointDateParts(point).day === day);
  if (exactPoint !== undefined) {
    return { point: exactPoint, hasRecord: true };
  }
  const earlierPoints = monthPoints.filter((point) => getPointDateParts(point).day < day);
  const nearestPoint = earlierPoints.at(-1) ?? monthPoints[0];
  return nearestPoint === undefined ? null : { point: nearestPoint, hasRecord: false };
};

const formatMonthDay = (month, day) =>
  `${month}${MESSAGES.monthSuffix} ${day}${MESSAGES.daySuffix}`;

const formatDayLabel = (track, selectedMonth, selectedDay, { point, hasRecord }) => {
  const { year, month, day } = getPointDateParts(point);
  const separator = MESSAGES.trackDayLabelSeparator;
  const positionSuffix = MESSAGES.trackDayPositionSuffix;
  if (hasRecord) {
    const date = `${year}${MESSAGES.yearSuffix} ${formatMonthDay(month, day)}`;
    return `${track.individualName}${separator}${date}${positionSuffix}`;
  }
  const selected = formatMonthDay(selectedMonth, selectedDay);
  const fallback = `${MESSAGES.trackDayFallbackOpen}${formatMonthDay(month, day)}${positionSuffix}${MESSAGES.trackDayFallbackClose}`;
  return `${track.individualName}${separator}${selected}${MESSAGES.trackDayNoRecordSuffix}${fallback}`;
};

const createDayLabel = (text) => {
  const element = document.createElement("span");
  element.textContent = text;
  return element;
};

const createDayPosition = (track, color, selectedMonth, selectedDay) => {
  const record = findDayRecord(track, selectedMonth, selectedDay);
  if (record === null) {
    return null;
  }
  const marker = createCircleMarker(toLatLng(record.point), color, {
    radius: REAL_TRACK.dayPositionRadius,
    strokeWeight: REAL_TRACK.dayPositionStrokeWeight,
    className: REAL_TRACK.dayPositionClassName,
  });
  return marker.bindTooltip(
    createDayLabel(formatDayLabel(track, selectedMonth, selectedDay, record)),
    {
      permanent: true,
      direction: "top",
      offset: [0, -REAL_TRACK.dayPositionRadius],
      className: REAL_TRACK.dayLabelClassName,
    },
  );
};

export const createRealTrack = (map, tracks) => {
  ensurePane(map);
  const layer = L.layerGroup().addTo(map);
  const dayPositionLayer = L.layerGroup().addTo(map);
  let segments = [];
  let frameId = null;

  const clear = () => {
    cancelAnimationFrame(frameId);
    frameId = null;
    segments = [];
    layer.clearLayers();
    dayPositionLayer.clearLayers();
  };

  const collectSegments = (loadedTopics, month) =>
    tracks
      .filter(({ topicId }) => loadedTopics.some((topicData) => topicData.topic.id === topicId))
      .map(({ topicId, data }) => ({
        track: data,
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

  const showDay = (selectedDate) => {
    dayPositionLayer.clearLayers();
    segments.forEach(({ track, color }) => {
      const marker = createDayPosition(track, color, selectedDate.getMonth() + 1, selectedDate.getDate());
      if (marker !== null) {
        marker.addTo(dayPositionLayer);
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

  return { draw, showDay, animate };
};
