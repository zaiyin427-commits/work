import { MESSAGES } from "./config.js";

export const initMonthSlider = (initialMonth, onChange, onUserInput = () => {}) => {
  const slider = document.getElementById("month-slider");
  const label = document.getElementById("month-label");

  const showMonth = (month) => {
    slider.value = String(month);
    label.textContent = `${month}${MESSAGES.monthSuffix}`;
  };

  const setMonth = (month) => {
    showMonth(month);
    onChange(month);
  };

  slider.addEventListener("input", () => {
    onUserInput();
    setMonth(Number(slider.value));
  });

  showMonth(initialMonth);

  return { setMonth };
};
