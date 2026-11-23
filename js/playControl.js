import { MESSAGES, MONTHS_PER_YEAR, CALENDAR, PLAYBACK } from "./config.js";
import { createClampedDate } from "./dateUtils.js";

const getNextDateWithinYear = (date) =>
  createClampedDate(
    date.getFullYear(),
    (date.getMonth() + CALENDAR.monthsPerStep) % MONTHS_PER_YEAR,
    date.getDate(),
  );

export const initPlayControl = (getDate, setDate) => {
  const button = document.getElementById("play-toggle");
  let timerId = null;

  const isPlaying = () => timerId !== null;

  const showState = () => {
    button.setAttribute("aria-pressed", String(isPlaying()));
    button.textContent = isPlaying() ? MESSAGES.pauseLabel : MESSAGES.playLabel;
  };

  const stop = () => {
    clearInterval(timerId);
    timerId = null;
    showState();
  };

  const start = () => {
    timerId = setInterval(
      () => setDate(getNextDateWithinYear(getDate())),
      PLAYBACK.intervalMilliseconds,
    );
    showState();
  };

  button.addEventListener("click", () => (isPlaying() ? stop() : start()));
  showState();
  button.hidden = false;

  return { stop };
};
