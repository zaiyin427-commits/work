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

const blossomCenter = `<circle cx="16" cy="16" r="2.4" fill="${SPECIES_ICON.outlineColor}" stroke="none"/>`;

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
      `<path d="M2 17 C6 20 10 21 15 20 C20 19 24 20 26 22 C26 26 20 26 14 26 C8 26 4 24 2 17 Z"/>`,
    ) +
    thickLine("M23 22 C29 17 22 15 22 10 C22 7 19 6.5 17.5 7.5", 3.4) +
    outlined(`<circle cx="17.5" cy="7.5" r="2.4"/><path d="M16 6.5 L10 8.5 L16 10 Z"/>`) +
    thickLine("M3 28.5 Q8 26.8 13 28.5 T23 28.5 T29 28.5", 1.2),
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
    outlined(petalRing(5, 6.5, 5.6, -Math.PI / 2) + blossomCenter),
  "double-cherry-blossom": () =>
    outlined(
      petalRing(5, 9, 6.2, -Math.PI / 2) +
        petalRing(5, 5.6, 5, -Math.PI / 2 + Math.PI / 5) +
        blossomCenter,
    ),
  "maple-leaf": () =>
    outlined(
      `<path d="M16 2 L19 8 L23 6 L22 13 L28 11 L26 17 L30 19 L22 22 L23 25 L17 24 L17 30 L15 30 L15 24 L9 25 L10 22 L2 19 L6 17 L4 11 L10 13 L9 6 L13 8 Z"/>`,
    ),
  "ginkgo-leaf": () =>
    thickLine("M16 21 V29.5", 2) +
    outlined(
      `<path d="M16 22 C9 20 3 14 4 7 C7 9 10 7 12 5 C14 6 15 7 16 9 C17 7 18 6 20 5 C22 7 25 9 28 7 C29 14 23 20 16 22 Z"/>`,
    ),
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
