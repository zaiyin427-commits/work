import {
  MONTH_MIN,
  MONTH_MAX,
  SEASON_LEAP_REFERENCE_YEAR,
  SEASON_STATUS,
  SEASON_VIEWING_WINDOW_DAYS,
} from "./config.js";
import { getDaysInMonth, formatMonthDayLabel } from "./dateUtils.js";

const MONTH_DAY_PATTERN = /^(\d{2})-(\d{2})$/;
const MONTH_MULTIPLIER = 100;

const getReferenceDaysInMonth = (month) =>
  getDaysInMonth(SEASON_LEAP_REFERENCE_YEAR, month - 1);

export const parseMonthDay = (text) => {
  const match = MONTH_DAY_PATTERN.exec(text);
  if (match === null) {
    return null;
  }
  const month = Number(match[1]);
  const day = Number(match[2]);
  if (month < MONTH_MIN || month > MONTH_MAX) {
    return null;
  }
  if (day < 1 || day > getReferenceDaysInMonth(month)) {
    return null;
  }
  return { month, day };
};

const toDayOrdinal = (month, day) => month * MONTH_MULTIPLIER + day;

const parseOrThrow = (text) => {
  const parsed = parseMonthDay(text);
  if (parsed === null) {
    throw new Error(`MM-DD 형식이 아닌 날짜입니다: "${text}"`);
  }
  return parsed;
};

const getEndOrdinalWithWindow = (lastEvent, year, windowDays) => {
  const end = new Date(year, lastEvent.month - 1, lastEvent.day + windowDays);
  if (end.getFullYear() > year) {
    return toDayOrdinal(MONTH_MAX, getReferenceDaysInMonth(MONTH_MAX));
  }
  return toDayOrdinal(end.getMonth() + 1, end.getDate());
};

export const sortEventsByDate = (events) =>
  events.slice().sort((a, b) => a.date.localeCompare(b.date));

export const mergeObservedEvents = (normalEvents, observedEvents) => {
  const observedDateByName = new Map(
    observedEvents.map((event) => [event.name, event.date]),
  );
  const events = normalEvents.map((event) => ({
    name: event.name,
    date: observedDateByName.get(event.name) ?? event.date,
  }));
  const observedCount = normalEvents.filter((event) =>
    observedDateByName.has(event.name),
  ).length;
  return { events, observedCount };
};

export const getSeasonStatus = (
  events,
  today,
  windowDays = SEASON_VIEWING_WINDOW_DAYS,
) => {
  if (events.length === 0) {
    throw new Error("계절 이벤트 날짜가 비어 있습니다.");
  }
  const sortedEvents = sortEventsByDate(events);
  const firstEvent = parseOrThrow(sortedEvents[0].date);
  const lastEvent = parseOrThrow(sortedEvents.at(-1).date);
  const todayOrdinal = toDayOrdinal(today.getMonth() + 1, today.getDate());
  if (todayOrdinal < toDayOrdinal(firstEvent.month, firstEvent.day)) {
    return SEASON_STATUS.before;
  }
  const endOrdinal = getEndOrdinalWithWindow(lastEvent, today.getFullYear(), windowDays);
  return todayOrdinal <= endOrdinal ? SEASON_STATUS.inSeason : SEASON_STATUS.after;
};

export const formatMonthDay = (text) => {
  const { month, day } = parseOrThrow(text);
  return formatMonthDayLabel(month, day);
};
