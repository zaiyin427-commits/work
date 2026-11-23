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
