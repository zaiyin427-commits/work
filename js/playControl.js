import { MESSAGES, MONTH_MIN, MONTH_MAX, PLAYBACK } from "./config.js";

const getNextMonth = (month) => (month === MONTH_MAX ? MONTH_MIN : month + 1);

export const initPlayControl = (getMonth, setMonth) => {
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
      () => setMonth(getNextMonth(getMonth())),
      PLAYBACK.intervalMilliseconds,
    );
    showState();
  };

  button.addEventListener("click", () => (isPlaying() ? stop() : start()));
  showState();
  button.hidden = false;

  return { stop };
};
