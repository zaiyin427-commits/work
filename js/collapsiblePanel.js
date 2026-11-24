import { CALENDAR, MESSAGES } from "./config.js";

const createMarkerSpan = (marker) => {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = ` ${marker}`;
  return span;
};

export const createCollapsiblePanel = ({
  panel,
  toggle,
  body,
  getLabel,
  onExpand = () => {},
  escapeTarget,
  stopsEscapePropagation = false,
}) => {
  const compactLayout = window.matchMedia(CALENDAR.compactMediaQuery);

  const isExpanded = () => panel.classList.contains("is-expanded");

  const isCompact = () => compactLayout.matches;

  const refreshLabel = () => {
    const expanded = isExpanded();
    const marker = expanded
      ? MESSAGES.calendarExpandedMarker
      : MESSAGES.calendarCollapsedMarker;
    toggle.replaceChildren(getLabel(), createMarkerSpan(marker));
    toggle.setAttribute("aria-expanded", String(expanded));
  };

  const collapse = () => {
    if (!isExpanded()) {
      return;
    }
    const hadFocusInBody = body.contains(document.activeElement);
    panel.classList.remove("is-expanded");
    refreshLabel();
    if (hadFocusInBody) {
      toggle.focus();
    }
  };

  const collapseIfCompact = () => {
    if (isCompact()) {
      collapse();
    }
  };

  const expand = () => {
    panel.classList.add("is-expanded");
    refreshLabel();
    if (isCompact()) {
      onExpand();
    }
  };

  const applyLayoutDefault = () => {
    if (isCompact()) {
      collapse();
      return;
    }
    panel.classList.add("is-expanded");
    refreshLabel();
  };

  toggle.addEventListener("click", () => (isExpanded() ? collapse() : expand()));
  compactLayout.addEventListener("change", applyLayoutDefault);
  escapeTarget.addEventListener("keydown", (event) => {
    if (event.key === CALENDAR.collapseKey && isExpanded()) {
      if (stopsEscapePropagation) {
        event.stopPropagation();
      }
      collapse();
    }
  });
  applyLayoutDefault();

  return { collapse, collapseIfCompact, isExpanded, isCompact, refreshLabel };
};
