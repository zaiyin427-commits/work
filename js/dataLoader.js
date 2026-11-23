import { MONTH_MIN, MONTH_MAX } from "./config.js";

const isPlainObject = (value) =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const isNonEmptyString = (value) =>
  typeof value === "string" && value.trim() !== "";

const isValidMonth = (month) =>
  Number.isInteger(month) && month >= MONTH_MIN && month <= MONTH_MAX;

const validateSpecies = (species, speciesId) => {
  if (!isPlainObject(species)) {
    throw new Error(`종 "${speciesId}" 항목이 객체가 아닙니다.`);
  }
  ["name", "description", "tips"].forEach((field) => {
    if (!isNonEmptyString(species[field])) {
      throw new Error(`종 "${speciesId}"에 비어 있지 않은 문자열 ${field}이(가) 없습니다.`);
    }
  });
  if (typeof species.color !== "string") {
    throw new Error(`종 "${speciesId}"의 color가 문자열이 아닙니다.`);
  }
  if (species.breedingArea !== undefined) {
    validateBreedingArea(species.breedingArea, speciesId);
  }
};

const validateBreedingArea = (breedingArea, speciesId) => {
  if (!isPlainObject(breedingArea)) {
    throw new Error(`종 "${speciesId}"의 breedingArea가 객체가 아닙니다.`);
  }
  if (!isNonEmptyString(breedingArea.name)) {
    throw new Error(`종 "${speciesId}"의 breedingArea에 비어 있지 않은 문자열 name이 없습니다.`);
  }
  if (!Number.isFinite(breedingArea.lat) || !Number.isFinite(breedingArea.lng)) {
    throw new Error(`종 "${speciesId}"의 breedingArea lat/lng가 숫자가 아닙니다.`);
  }
};

const validateObservation = (observation, siteId, speciesTable) => {
  if (!isPlainObject(observation)) {
    throw new Error(`사이트 "${siteId}"의 observations 항목이 객체가 아닙니다.`);
  }
  if (!isPlainObject(speciesTable[observation.species])) {
    throw new Error(`사이트 "${siteId}"의 관찰 기록이 존재하지 않는 종 "${observation.species}"을(를) 가리킵니다.`);
  }
  const months = observation.months;
  if (!Array.isArray(months) || !months.every(isValidMonth)) {
    throw new Error(`사이트 "${siteId}"의 종 "${observation.species}"에 1~12 범위를 벗어난 월 값이 있습니다.`);
  }
};

const validateSite = (site, speciesTable) => {
  if (!isPlainObject(site) || typeof site.id !== "string") {
    throw new Error("sites 항목에 문자열 id가 없습니다.");
  }
  if (!isNonEmptyString(site.name)) {
    throw new Error(`사이트 "${site.id}"에 비어 있지 않은 문자열 name이 없습니다.`);
  }
  if (!Number.isFinite(site.lat) || !Number.isFinite(site.lng)) {
    throw new Error(`사이트 "${site.id}"의 lat/lng가 숫자가 아닙니다.`);
  }
  if (!Array.isArray(site.observations)) {
    throw new Error(`사이트 "${site.id}"에 observations 배열이 없습니다.`);
  }
  site.observations.forEach((observation) =>
    validateObservation(observation, site.id, speciesTable),
  );
};

export const validateTopicData = (data) => {
  if (!isPlainObject(data)) {
    throw new Error("데이터가 객체가 아닙니다.");
  }
  if (!isPlainObject(data.topic)) {
    throw new Error("필수 필드 topic이 없습니다.");
  }
  if (!isNonEmptyString(data.topic.id) || !isNonEmptyString(data.topic.title)) {
    throw new Error("topic에 비어 있지 않은 문자열 id와 title이 필요합니다.");
  }
  if (!isPlainObject(data.species)) {
    throw new Error("필수 필드 species가 없습니다.");
  }
  if (!Array.isArray(data.sites)) {
    throw new Error("필수 필드 sites가 없습니다.");
  }
  Object.entries(data.species).forEach(([speciesId, species]) =>
    validateSpecies(species, speciesId),
  );
  data.sites.forEach((site) => validateSite(site, data.species));
  return data;
};

export const loadTopicData = async (topic) => {
  const response = await fetch(topic.dataFile);
  if (!response.ok) {
    throw new Error(`${topic.dataFile} 요청 실패 (HTTP ${response.status})`);
  }
  const data = await response.json();
  return validateTopicData(data);
};
