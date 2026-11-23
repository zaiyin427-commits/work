import { CALENDAR, MESSAGES, getToday } from "./config.js";
import {
  getDaysInMonth,
  shiftMonth,
  startOfDay,
  isSameDay,
  formatMonthDayText,
} from "./dateUtils.js";

const byId = (id) => document.getElementById(id);

const padIsoPart = (value) => String(value).padStart(CALENDAR.isoPartWidth, "0");

const formatIsoDate = (date) =>
  [date.getFullYear(), padIsoPart(date.getMonth() + 1), padIsoPart(date.getDate())].join("-");

const formatMonthTitle = (date) =>
  `${date.getFullYear()}${MESSAGES.yearSuffix} ${date.getMonth() + 1}${MESSAGES.monthSuffix}`;

const formatFullDate = (date) =>
  `${date.getFullYear()}${MESSAGES.yearSuffix} ${formatMonthDayText(date)}`;

const getMonthKey = (date) => `${date.getFullYear()}-${date.getMonth()}`;

const createWeekdayCell = (label) => {
  const cell = document.createElement("span");
  cell.textContent = label;
  return cell;
};

const createDayButton = (date, today, onSelect) => {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = String(date.getDate());
  button.dataset.date = formatIsoDate(date);
  button.setAttribute("aria-label", formatFullDate(date));
  if (isSameDay(date, today)) {
    button.setAttribute("aria-current", "date");
  }
  button.addEventListener("click", () => onSelect(date));
  return button;
};

const createMonthButtons = (monthDate, onSelect) => {
  const today = getToday();
  const buttons = Array.from({ length: getDaysInMonth(monthDate.getFullYear(), monthDate.getMonth()) }, (_, index) =>
    createDayButton(
      new Date(monthDate.getFullYear(), monthDate.getMonth(), index + 1),
      today,
      onSelect,
    ),
  );
  buttons[0].style.gridColumnStart = String(
    new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).getDay() + 1,
  );
  return buttons;
};

const createMarkerSpan = (marker) => {
  const span = document.createElement("span");
  span.setAttribute("aria-hidden", "true");
  span.textContent = ` ${marker}`;
  return span;
};

export const initDateCalendar = (
  initialDate,
  { onChange, onUserInput = () => {}, onExpand = () => {} },
) => {
  const card = byId("date-calendar");
  const toggle = byId("calendar-toggle");
  const title = byId("calendar-title");
  const grid = byId("calendar-grid");
  let selectedDate = startOfDay(initialDate);
  let shownMonthKey = null;

  const isCollapsible = () => getComputedStyle(toggle).display !== "none";

  const showToggleLabel = () => {
    const isExpanded = card.classList.contains("is-expanded");
    const marker = isExpanded
      ? MESSAGES.calendarExpandedMarker
      : MESSAGES.calendarCollapsedMarker;
    toggle.replaceChildren(formatMonthDayText(selectedDate), createMarkerSpan(marker));
    toggle.setAttribute("aria-expanded", String(isExpanded));
  };

  const showSelection = () => {
    grid.querySelectorAll("button").forEach((button) =>
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.date === formatIsoDate(selectedDate)),
      ),
    );
  };

  const focusSelectedDay = () =>
    grid.querySelector(`button[data-date="${formatIsoDate(selectedDate)}"]`)?.focus();

  const showMonth = () => {
    const monthKey = getMonthKey(selectedDate);
    if (monthKey === shownMonthKey) {
      return;
    }
    shownMonthKey = monthKey;
    title.textContent = formatMonthTitle(selectedDate);
    const hadFocusInGrid = grid.contains(document.activeElement);
    grid.replaceChildren(...createMonthButtons(selectedDate, selectDayByUser));
    if (hadFocusInGrid) {
      focusSelectedDay();
    }
  };

  const show = () => {
    showMonth();
    showSelection();
    showToggleLabel();
  };

  const select = (date) => {
    const nextDate = startOfDay(date);
    if (isSameDay(nextDate, selectedDate)) {
      return;
    }
    selectedDate = nextDate;
    show();
    onChange(selectedDate);
  };

  const collapse = () => {
    if (!card.classList.contains("is-expanded")) {
      return;
    }
    const hadFocusInBody = byId("calendar-body").contains(document.activeElement);
    card.classList.remove("is-expanded");
    showToggleLabel();
    if (hadFocusInBody) {
      toggle.focus();
    }
  };

  const expand = () => {
    card.classList.add("is-expanded");
    showToggleLabel();
    onExpand();
  };

  function selectByUser(date) {
    onUserInput();
    select(date);
  }

  function selectDayByUser(date) {
    selectByUser(date);
    if (isCollapsible()) {
      collapse();
    }
  }

  byId("calendar-prev").addEventListener("click", () =>
    selectByUser(shiftMonth(selectedDate, -CALENDAR.monthsPerStep)),
  );
  byId("calendar-next").addEventListener("click", () =>
    selectByUser(shiftMonth(selectedDate, CALENDAR.monthsPerStep)),
  );
  byId("calendar-today").addEventListener("click", () => selectByUser(getToday()));
  toggle.addEventListener("click", () =>
    card.classList.contains("is-expanded") ? collapse() : expand(),
  );
  document.addEventListener("keydown", (event) => {
    if (event.key === CALENDAR.collapseKey) {
      collapse();
    }
  });

  byId("calendar-weekdays").replaceChildren(
    ...CALENDAR.weekdayLabels.map(createWeekdayCell),
  );
  show();
  card.hidden = false;

  return { setDate: select, getDate: () => selectedDate, collapse };
};
