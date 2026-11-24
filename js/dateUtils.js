import { MESSAGES } from "./config.js";

export const getDaysInMonth = (year, monthIndex) =>
  new Date(year, monthIndex + 1, 0).getDate();

export const createClampedDate = (year, monthIndex, day) =>
  new Date(year, monthIndex, Math.min(day, getDaysInMonth(year, monthIndex)));

export const shiftMonth = (date, monthDelta) =>
  createClampedDate(date.getFullYear(), date.getMonth() + monthDelta, date.getDate());

export const startOfDay = (date) =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

export const isSameDay = (a, b) => a.getTime() === b.getTime();

export const formatMonthDayLabel = (month, day) =>
  `${month}${MESSAGES.monthSuffix} ${day}${MESSAGES.daySuffix}`;

export const formatMonthDayText = (date) =>
  formatMonthDayLabel(date.getMonth() + 1, date.getDate());

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

export const parseIsoDate = (text) => {
  const match = typeof text === "string" ? ISO_DATE_PATTERN.exec(text) : null;
  if (match === null) {
    return null;
  }
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  const isRealDate =
    date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
  return isRealDate ? date : null;
};

export const getDaysBetween = (from, to) =>
  Math.round(
    (Date.UTC(to.getFullYear(), to.getMonth(), to.getDate()) -
      Date.UTC(from.getFullYear(), from.getMonth(), from.getDate())) /
      MILLISECONDS_PER_DAY,
  );
