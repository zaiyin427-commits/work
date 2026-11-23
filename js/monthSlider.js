import { MESSAGES } from "./config.js";

export const initMonthSlider = (initialMonth, onChange) => {
  const slider = document.getElementById("month-slider");
  const label = document.getElementById("month-label");

  const showMonth = (month) => {
    slider.value = String(month);
    label.textContent = `${month}${MESSAGES.monthSuffix}`;
  };

  slider.addEventListener("input", () => {
    const month = Number(slider.value);
    showMonth(month);
    onChange(month);
  });

  showMonth(initialMonth);
};
