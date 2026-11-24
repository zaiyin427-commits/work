import {
  MIGRATION_ANIMATION,
  REAL_TRACK,
  MESSAGES,
  ISO_DATE_PATTERN,
  FALLBACK_MARKER_COLOR,
} from "./config.js";
import { ensurePane, prefersReducedMotion } from "./migrationAnimation.js";

const getPointMonth = (point) => Number(ISO_DATE_PATTERN.exec(point[0])[2]);

const toLatLng = (point) => [point[1], point[2]];

export const getMonthSegment = (track, month) => {
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

  const collectSegments = (enabledTopics, month) =>
    tracks
      .filter(({ topicId }) => enabledTopics.some((topicData) => topicData.topic.id === topicId))
      .map(({ topicId, data }) => ({
        points: getMonthSegment(data, month),
        color: getTrackColor(data, enabledTopics, topicId),
      }))
      .filter(({ points }) => points.length > 0);

  const draw = (enabledTopics, month) => {
    clear();
    segments = collectSegments(enabledTopics, month);
    segments.forEach(({ points, color }) => createPath(points, color).addTo(layer));
  };

  const animate = () => {
    if (segments.length === 0 || prefersReducedMotion()) {
      return;
    }
    const dots = segments.map(({ points, color }) => ({
      points,
      dot: createDot(points[0], color).addTo(layer),
    }));
    const startTime = performance.now();
    const step = (now) => {
      const ratio = (now - startTime) / MIGRATION_ANIMATION.durationMilliseconds;
      if (ratio >= 1) {
        dots.forEach(({ dot }) => layer.removeLayer(dot));
        frameId = null;
        return;
      }
      dots.forEach(({ points, dot }) => dot.setLatLng(getPointAlongPath(points, ratio)));
      frameId = requestAnimationFrame(step);
    };
    frameId = requestAnimationFrame(step);
  };

  return { draw, animate };
};
