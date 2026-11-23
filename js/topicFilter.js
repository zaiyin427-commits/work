import { TOPICS } from "./config.js";

const getToggleId = (topicId) => `topic-toggle-${topicId}`;

const getTopicLabel = (topicData) =>
  TOPICS.find((topic) => topic.id === topicData.topic.id)?.label ?? topicData.topic.title;

const createToggle = (topicData, isPressed) => {
  const button = document.createElement("button");
  button.type = "button";
  button.id = getToggleId(topicData.topic.id);
  button.dataset.topicId = topicData.topic.id;
  button.textContent = getTopicLabel(topicData);
  button.setAttribute("aria-pressed", String(isPressed));
  return button;
};

const readEnabledTopicIds = (filter) =>
  new Set(
    [...filter.querySelectorAll("button[aria-pressed=true]")].map(
      (button) => button.dataset.topicId,
    ),
  );

const flipPressed = (button) =>
  button.setAttribute("aria-pressed", String(button.getAttribute("aria-pressed") !== "true"));

export const initTopicFilter = (topics, enabledTopicIds, onChange) => {
  const filter = document.getElementById("topic-filter");
  filter.append(
    ...topics.map((topicData) =>
      createToggle(topicData, enabledTopicIds.has(topicData.topic.id)),
    ),
  );
  filter.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-topic-id]");
    if (button === null) {
      return;
    }
    flipPressed(button);
    onChange(readEnabledTopicIds(filter));
  });
  filter.hidden = false;
};
