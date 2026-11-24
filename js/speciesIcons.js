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
  crane: () =>
    thickLine("M14 21 V28 M18 21 L19 28", 1.6) +
    outlined(
      `<path d="M4 14 Q9 11 17 12 Q24 13 22 18 Q18 23 11 22 Q7 20 4 14 Z"/>`,
    ) +
    thickLine("M20 15 C25 12 20 9 23 6", 2.6) +
    outlined(
      `<circle cx="23.5" cy="5.5" r="2.4"/><path d="M25 4.5 L31 6 L25 7.5 Z"/>`,
    ),
  goose: () =>
    outlined(
      `<path d="M7 16 Q13 13 22 15 L24 16 L22 18 Q13 19 7 16 Z"/>` +
        `<path d="M7 16 L2 13 L2 19 Z"/>` +
        `<path d="M19 15 C17 9 12 5 5 3 C9 8 11 13 13 16 Z"/>` +
        `<path d="M19 17 C17 23 12 27 5 29 C9 24 11 19 13 16 Z"/>`,
    ) +
    thickLine("M22 16 L26 13.5", 2.4) +
    outlined(`<circle cx="27" cy="13" r="2"/><path d="M28.5 12 L32 13.5 L28.5 15 Z"/>`),
  swan: () =>
    outlined(
      `<path d="M2.5 14 C3.5 18 7 18.5 10 18 C13 17.2 16 18 19 19 C24 19.5 27 22 25.5 25 C24 28 18 28.5 13 28.5 C6 28.5 2.5 24.5 2.5 14 Z"/>`,
    ) +
    thickLine("M23 22 C28.5 20 27 15 22 13 C17 11 16.5 6.5 20.5 5.5", 3) +
    outlined(`<circle cx="21" cy="5.5" r="2.4"/><path d="M22.6 4.6 L28.5 6 L22.6 7.3 Z"/>`),
  duck: () =>
    outlined(
      `<ellipse cx="14" cy="20" rx="9.5" ry="5.8"/>` +
        `<path d="M5 18 L1 14 L9 16.5 Z"/>` +
        `<path d="M19 17 L21 11 L26 11 L24 18 Z"/>` +
        `<circle cx="23.5" cy="9.5" r="4.2"/>` +
        `<path d="M26.5 8.5 L31.5 10.5 L26.5 12.5 Z"/>`,
    ) +
    `<circle cx="24.5" cy="8.5" r="1" fill="${SPECIES_ICON.outlineColor}"/>` +
    thickLine("M3 28.5 Q8 26.8 13 28.5 T23 28.5 T29 28.5", 1.2),
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
