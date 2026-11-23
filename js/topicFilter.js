const getToggleId = (topicId) => `topic-toggle-${topicId}`;

const createOption = (topicData, isChecked) => {
  const topicId = topicData.topic.id;

  const input = document.createElement("input");
  input.type = "checkbox";
  input.id = getToggleId(topicId);
  input.dataset.topicId = topicId;
  input.checked = isChecked;

  const label = document.createElement("label");
  label.htmlFor = input.id;
  label.textContent = topicData.topic.title;

  const option = document.createElement("div");
  option.className = "topic-option";
  option.append(input, label);
  return option;
};

const readEnabledTopicIds = (filter) =>
  new Set(
    [...filter.querySelectorAll("input[type=checkbox]:checked")].map(
      (input) => input.dataset.topicId,
    ),
  );

export const initTopicFilter = (topics, enabledTopicIds, onChange) => {
  const filter = document.getElementById("topic-filter");
  const options = topics.map((topicData) =>
    createOption(topicData, enabledTopicIds.has(topicData.topic.id)),
  );
  filter.append(...options);
  filter.addEventListener("change", () => onChange(readEnabledTopicIds(filter)));
  filter.hidden = false;
};
