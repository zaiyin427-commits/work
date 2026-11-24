import { FESTIVAL, FESTIVAL_PHASE, FESTIVAL_STATUS, MESSAGES } from "./config.js";
import { parseIsoDate, getDaysBetween } from "./dateUtils.js";

export const parseFestival = (festival) => ({
  ...festival,
  start: parseIsoDate(festival.startDate),
  end: parseIsoDate(festival.endDate),
});

export const overlapsYear = (festival, year) =>
  festival.start.getFullYear() <= year && festival.end.getFullYear() >= year;

const getPhase = (daysUntilStart, daysUntilEnd) => {
  if (daysUntilStart > 0) {
    return FESTIVAL_PHASE.before;
  }
  return daysUntilEnd < 0 ? FESTIVAL_PHASE.ended : FESTIVAL_PHASE.ongoing;
};

const getNearStatus = (phase, daysUntilStart, daysUntilEnd) => {
  if (phase === FESTIVAL_PHASE.ongoing) {
    return FESTIVAL_STATUS.ongoing;
  }
  if (phase === FESTIVAL_PHASE.before && daysUntilStart <= FESTIVAL.upcomingWindowDays) {
    return FESTIVAL_STATUS.upcoming;
  }
  if (phase === FESTIVAL_PHASE.ended && -daysUntilEnd <= FESTIVAL.recentlyEndedWindowDays) {
    return FESTIVAL_STATUS.recentlyEnded;
  }
  return null;
};

export const getFestivalState = (festival, selectedDate) => {
  const daysUntilStart = getDaysBetween(selectedDate, festival.start);
  const daysUntilEnd = getDaysBetween(selectedDate, festival.end);
  const phase = getPhase(daysUntilStart, daysUntilEnd);
  return {
    phase,
    daysUntilStart,
    daysUntilEnd,
    nearStatus: getNearStatus(phase, daysUntilStart, daysUntilEnd),
  };
};

export const isEndingSoon = ({ phase, daysUntilEnd }) =>
  phase === FESTIVAL_PHASE.ongoing && daysUntilEnd > 0 && daysUntilEnd <= FESTIVAL.endingSoonDays;

const formatBefore = ({ daysUntilStart }) => `${MESSAGES.festivalDDayPrefix}${daysUntilStart}`;

const joinStatus = (...parts) => parts.join(MESSAGES.festivalStatusSeparator);

export const formatStatusText = (state) => {
  if (state.phase === FESTIVAL_PHASE.before) {
    return formatBefore(state);
  }
  if (state.phase === FESTIVAL_PHASE.ended) {
    return `${-state.daysUntilEnd}${MESSAGES.festivalEndedAgoSuffix}`;
  }
  const endText =
    state.daysUntilEnd === 0
      ? MESSAGES.festivalEndsToday
      : `${MESSAGES.festivalEndsInPrefix}${state.daysUntilEnd}${MESSAGES.daySuffix}`;
  return joinStatus(MESSAGES.festivalStatusOngoing, endText);
};

export const formatCompactStatusText = (state) => {
  if (state.phase === FESTIVAL_PHASE.before) {
    return formatBefore(state);
  }
  if (state.phase === FESTIVAL_PHASE.ended) {
    return MESSAGES.festivalStatusEnded;
  }
  return state.daysUntilEnd === 0
    ? joinStatus(MESSAGES.festivalStatusOngoing, MESSAGES.festivalEndsToday)
    : MESSAGES.festivalStatusOngoing;
};
