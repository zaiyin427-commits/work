import { CALENDAR, FESTIVAL, FESTIVAL_STATUS, MESSAGES } from "./config.js";
import { parseFestival, getFestivalState } from "./festivalStatus.js";
import { formatPeriod, createTextElement, createStatusLine } from "./festivalLayer.js";

const classOf = (suffix) => `${FESTIVAL.listClassPrefix}${suffix}`;

const byId = (id) => document.getElementById(id);

const getSortValue = ({ festival, state }) => {
  if (state.nearStatus === FESTIVAL_STATUS.upcoming) {
    return festival.start.getTime();
  }
  return state.nearStatus === FESTIVAL_STATUS.recentlyEnded
    ? -festival.end.getTime()
    : festival.end.getTime();
};

const STATUS_ORDER = [FESTIVAL_STATUS.ongoing, FESTIVAL_STATUS.upcoming, FESTIVAL_STATUS.recentlyEnded];

const compareItems = (a, b) =>
  STATUS_ORDER.indexOf(a.state.nearStatus) - STATUS_ORDER.indexOf(b.state.nearStatus) ||
  getSortValue(a) - getSortValue(b);

const findNearItems = (festivals, selectedDate) =>
  festivals
    .map((festival) => ({ festival, state: getFestivalState(festival, selectedDate) }))
    .filter(({ state }) => state.nearStatus !== null)
    .sort(compareItems);

const formatTopicNames = (festival, topicTitles) =>
  festival.topicIds
    .map((topicId) => topicTitles.get(topicId))
    .filter((title) => title !== undefined)
    .join(MESSAGES.festivalTopicSeparator);

const createItem = ({ festival, state }, topicTitles, onSelect) => {
  const item = document.createElement("li");
  const button = document.createElement("button");
  button.type = "button";
  button.className = classOf("__item");
  button.dataset.festivalId = festival.id;
  if (state.nearStatus === FESTIVAL_STATUS.ongoing) {
    button.classList.add(classOf("__item--ongoing"));
  }
  button.append(
    createTextElement("span", festival.title, classOf("__title")),
    createTextElement("span", formatPeriod(festival)),
    createTextElement("span", festival.address),
    createStatusLine("span", state, classOf("__status")),
  );
  const topicNames = formatTopicNames(festival, topicTitles);
  if (topicNames !== "") {
    button.append(createTextElement("span", topicNames, classOf("__topics")));
  }
  button.addEventListener("click", () => onSelect(festival.id));
  item.append(button);
  return item;
};

const createMarkerSpan = (marker) => {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = ` ${marker}`;
  return span;
};

export const initFestivalList = (festivals, topicTitles, { onSelect, onExpand }) => {
  const panel = byId("festival-list");
  const toggle = byId("festival-list-toggle");
  const body = byId("festival-list-body");
  const parsedFestivals = festivals.map(parseFestival);
  const compactLayout = window.matchMedia(CALENDAR.compactMediaQuery);
  let count = 0;

  const showToggleLabel = () => {
    const isExpanded = panel.classList.contains("is-expanded");
    const marker = isExpanded
      ? MESSAGES.calendarExpandedMarker
      : MESSAGES.calendarCollapsedMarker;
    toggle.replaceChildren(
      `${MESSAGES.festivalListHeadingPrefix}${count}${MESSAGES.festivalListHeadingSuffix}`,
      createMarkerSpan(marker),
    );
    toggle.setAttribute("aria-expanded", String(isExpanded));
  };

  const collapse = () => {
    if (!panel.classList.contains("is-expanded")) {
      return;
    }
    const hadFocusInBody = body.contains(document.activeElement);
    panel.classList.remove("is-expanded");
    showToggleLabel();
    if (hadFocusInBody) {
      toggle.focus();
    }
  };

  const collapseIfCompact = () => {
    if (compactLayout.matches) {
      collapse();
    }
  };

  const expand = () => {
    panel.classList.add("is-expanded");
    showToggleLabel();
    if (compactLayout.matches) {
      onExpand();
    }
  };

  const applyLayoutDefault = () => {
    if (compactLayout.matches) {
      collapse();
      return;
    }
    panel.classList.add("is-expanded");
    showToggleLabel();
  };

  const restoreFocus = (focusedFestivalId) => {
    const sameButton = [...body.querySelectorAll("button")].find(
      (button) => button.dataset.festivalId === focusedFestivalId,
    );
    (sameButton ?? toggle).focus();
  };

  const render = (selectedDate) => {
    const focusedElement = document.activeElement;
    const hadFocusInBody = body.contains(focusedElement);
    const focusedFestivalId = hadFocusInBody ? focusedElement.dataset.festivalId : undefined;
    const items = findNearItems(parsedFestivals, selectedDate);
    count = items.length;
    if (items.length === 0) {
      body.replaceChildren(createTextElement("p", MESSAGES.festivalListEmpty, classOf("__empty")));
    } else {
      const list = document.createElement("ul");
      list.className = classOf("__items");
      list.append(...items.map((item) => createItem(item, topicTitles, onSelect)));
      body.replaceChildren(
        list,
        createTextElement("p", MESSAGES.festivalSourceLine, classOf("__source")),
      );
    }
    showToggleLabel();
    if (hadFocusInBody) {
      restoreFocus(focusedFestivalId);
    }
  };

  const isListBesideMap = () => !compactLayout.matches && panel.classList.contains("is-expanded");

  const getRightPadding = () => {
    const gap = FESTIVAL.popupGap;
    return compactLayout.matches
      ? gap
      : byId("side-column").getBoundingClientRect().width + 2 * gap;
  };

  const listLeavesRoomForPopup = () => {
    const freeWidth =
      document.documentElement.clientWidth -
      getRightPadding() -
      (panel.getBoundingClientRect().right + FESTIVAL.popupGap);
    return freeWidth >= FESTIVAL.popupMaxWidth + FESTIVAL.popupFrameWidth;
  };

  const makeRoomForPopup = () => {
    if (isListBesideMap() && !listLeavesRoomForPopup()) {
      collapse();
    }
  };

  const getPopupPadding = () => {
    const gap = FESTIVAL.popupGap;
    const avoidList = isListBesideMap() && listLeavesRoomForPopup();
    return {
      topLeft: avoidList
        ? { x: panel.getBoundingClientRect().right + gap, y: gap }
        : { x: gap, y: toggle.getBoundingClientRect().bottom + gap },
      bottomRight: { x: getRightPadding(), y: gap },
    };
  };

  toggle.addEventListener("click", () =>
    panel.classList.contains("is-expanded") ? collapse() : expand(),
  );
  compactLayout.addEventListener("change", applyLayoutDefault);
  panel.addEventListener("keydown", (event) => {
    if (event.key === CALENDAR.collapseKey && panel.classList.contains("is-expanded")) {
      event.stopPropagation();
      collapse();
    }
  });

  applyLayoutDefault();
  panel.hidden = false;

  return { render, collapseIfCompact, makeRoomForPopup, getPopupPadding };
};
