import { SPECIES_ICON, FALLBACK_MARKER_COLOR } from "./config.js";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const outlined = (shapes) =>
  `<g stroke="${SPECIES_ICON.outlineColor}" stroke-width="${SPECIES_ICON.outlineWidth}" stroke-linejoin="round" stroke-linecap="round" paint-order="stroke">${shapes}</g>`;

const thickLine = (pathData, width) =>
  `<path d="${pathData}" fill="none" stroke="${SPECIES_ICON.outlineColor}" stroke-width="${width + SPECIES_ICON.outlineWidth * 2}" stroke-linecap="round"/>` +
  `<path d="${pathData}" fill="none" stroke="currentColor" stroke-width="${width}" stroke-linecap="round"/>`;

const petalRing = (count, ringRadius, petalRadius, startAngle) =>
  Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index * 2 * Math.PI) / count;
    const x = (16 + ringRadius * Math.cos(angle)).toFixed(2);
    const y = (16 + ringRadius * Math.sin(angle)).toFixed(2);
    return `<circle cx="${x}" cy="${y}" r="${petalRadius}"/>`;
  }).join("");

const AZALEA_PETAL_COUNT = 5;
const AZALEA_CENTER_Y = 19;
const AZALEA_STAMENS = [
  { control1: [17, 12], control2: [21, 8], tip: [26, 7] },
  { control1: [14, 12], control2: [10, 8], tip: [6, 8] },
  { control1: [16, 14], control2: [16, 9], tip: [18, 3.5] },
];
const AZALEA_STAMEN_WIDTH = 0.9;
const AZALEA_ANTHER_RADIUS = 1.7;
const FORSYTHIA_PETAL_COUNT = 4;

const roundCoordinate = (value) => Number(value.toFixed(2));

const azaleaStamenPath = ({ control1, control2, tip }) =>
  `M16 ${AZALEA_CENTER_Y} C${control1.join(" ")} ${control2.join(" ")} ${tip.join(" ")}`;

const rotatedEllipses = (count, centerX, centerY, offset, radiusX, radiusY, startAngle) =>
  Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index * 2 * Math.PI) / count;
    const degrees = roundCoordinate((angle * 180) / Math.PI);
    return `<ellipse cx="${roundCoordinate(centerX + offset)}" cy="${centerY}" rx="${roundCoordinate(radiusX)}" ry="${roundCoordinate(radiusY)}" transform="rotate(${degrees} ${centerX} ${centerY})"/>`;
  }).join("");

const forsythiaFlower = (centerX, centerY, scale) =>
  outlined(rotatedEllipses(FORSYTHIA_PETAL_COUNT, centerX, centerY, 6 * scale, 6.6 * scale, 2.5 * scale, Math.PI / 4)) +
  `<circle cx="${centerX}" cy="${centerY}" r="${roundCoordinate(1.5 * scale)}" fill="${SPECIES_ICON.outlineColor}" stroke="none"/>`;

const blossomCenterAt = (centerY) =>
  `<circle cx="16" cy="${centerY}" r="2.4" fill="${SPECIES_ICON.outlineColor}" stroke="none"/>`;

const ICON_BUILDERS = {
  "cherry-blossom": () =>
    outlined(petalRing(5, 6.5, 5.6, -Math.PI / 2) + blossomCenterAt(16)),
  "double-cherry-blossom": () =>
    outlined(
      petalRing(5, 9, 6.2, -Math.PI / 2) +
        petalRing(5, 5.6, 5, -Math.PI / 2 + Math.PI / 5) +
        blossomCenterAt(16),
    ),
  azalea: () =>
    outlined(rotatedEllipses(AZALEA_PETAL_COUNT, 16, AZALEA_CENTER_Y, 5.5, 6.8, 5.6, -Math.PI / 2)) +
    AZALEA_STAMENS.map((stamen) => thickLine(azaleaStamenPath(stamen), AZALEA_STAMEN_WIDTH)).join("") +
    outlined(AZALEA_STAMENS.map(({ tip: [x, y] }) => `<circle cx="${x}" cy="${y}" r="${AZALEA_ANTHER_RADIUS}"/>`).join("")) +
    blossomCenterAt(AZALEA_CENTER_Y),
  forsythia: () =>
    thickLine("M3 29 C10 26 16 24 24 22", 1.6) +
    forsythiaFlower(10, 11, 1) +
    forsythiaFlower(23, 19, 0.8),
  "maple-leaf": () =>
    outlined(
      `<path d="M16 2 L19 8 L23 6 L22 13 L28 11 L26 17 L30 19 L22 22 L23 25 L17 24 L17 30 L15 30 L15 24 L9 25 L10 22 L2 19 L6 17 L4 11 L10 13 L9 6 L13 8 Z"/>`,
    ),
  "ginkgo-leaf": () =>
    thickLine("M16 22 V29.5", 1.4) +
    outlined(
      `<path d="M16 23 L3 11 C5 7 9 6 12 7 C14 8 15 11 16 16 C17 11 18 8 20 7 C23 6 27 7 29 11 Z"/>`,
    ) +
    `<path d="M16 22 L7 10.5 M16 22 L11.5 9.5 M16 22 L20.5 9.5 M16 22 L25 10.5" fill="none" stroke="${SPECIES_ICON.outlineColor}" stroke-width="0.9" stroke-linecap="round"/>`,
};

export const SPECIES_ICON_IDS = Object.keys(ICON_BUILDERS);

export const getSpeciesIconSvg = (iconId, color) => {
  if (!Object.hasOwn(ICON_BUILDERS, iconId)) {
    return null;
  }
  const safeColor = SPECIES_ICON.colorPattern.test(color) ? color : FALLBACK_MARKER_COLOR;
  const size = SPECIES_ICON.viewBoxSize;
  return `<svg xmlns="${SVG_NAMESPACE}" viewBox="0 0 ${size} ${size}" width="100%" height="100%" fill="currentColor" color="${safeColor}" focusable="false" aria-hidden="true">${ICON_BUILDERS[iconId]()}</svg>`;
};
