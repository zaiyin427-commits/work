import { MONTH_MIN, MONTH_MAX } from "./config.js";
import { parseMonthDay } from "./seasonStatus.js";
import { parseIsoDate } from "./dateUtils.js";

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
  if (species.icon !== undefined && !isNonEmptyString(species.icon)) {
    throw new Error(`종 "${speciesId}"의 icon이 비어 있지 않은 문자열이 아닙니다.`);
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

const validateSeasonEvents = (events, ownerLabel) => {
  if (!Array.isArray(events) || events.length === 0) {
    throw new Error(`${ownerLabel}의 events가 비어 있지 않은 배열이 아닙니다.`);
  }
  events.forEach((event) => {
    if (!isPlainObject(event) || !isNonEmptyString(event.name)) {
      throw new Error(`${ownerLabel}의 이벤트에 비어 있지 않은 문자열 name이 없습니다.`);
    }
    if (typeof event.date !== "string" || parseMonthDay(event.date) === null) {
      throw new Error(`${ownerLabel}의 이벤트 "${event.name}" 날짜 "${event.date}"가 유효한 MM-DD가 아닙니다.`);
    }
  });
};

const validateSeasonalNormal = (seasonalNormal, siteId) => {
  const ownerLabel = `사이트 "${siteId}"의 seasonalNormal`;
  if (!isPlainObject(seasonalNormal)) {
    throw new Error(`${ownerLabel}이 객체가 아닙니다.`);
  }
  if (!isNonEmptyString(seasonalNormal.stationName)) {
    throw new Error(`${ownerLabel}에 비어 있지 않은 문자열 stationName이 없습니다.`);
  }
  if (!Number.isInteger(seasonalNormal.stationNumber)) {
    throw new Error(`${ownerLabel}의 stationNumber가 정수가 아닙니다.`);
  }
  if (typeof seasonalNormal.isProxy !== "boolean") {
    throw new Error(`${ownerLabel}의 isProxy가 불리언이 아닙니다.`);
  }
  if (!isNonEmptyString(seasonalNormal.item)) {
    throw new Error(`${ownerLabel}에 비어 있지 않은 문자열 item이 없습니다.`);
  }
  validateSeasonEvents(seasonalNormal.events, ownerLabel);
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
  if (site.seasonalNormal !== undefined) {
    validateSeasonalNormal(site.seasonalNormal, site.id);
  }
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

const SITE_KEY_PATTERN = /^[^/]+\/[^/]+$/;

export const validateSeasonObservations = (data) => {
  if (!isPlainObject(data)) {
    throw new Error("계절 관측 데이터가 객체가 아닙니다.");
  }
  if (typeof data.source !== "string") {
    throw new Error("계절 관측 데이터의 source가 문자열이 아닙니다.");
  }
  if (data.year !== null && !Number.isInteger(data.year)) {
    throw new Error("계절 관측 데이터의 year가 정수 또는 null이 아닙니다.");
  }
  if (data.updatedAt !== null && typeof data.updatedAt !== "string") {
    throw new Error("계절 관측 데이터의 updatedAt이 문자열 또는 null이 아닙니다.");
  }
  if (!isPlainObject(data.sites)) {
    throw new Error("계절 관측 데이터에 sites 객체가 없습니다.");
  }
  Object.entries(data.sites).forEach(([siteKey, events]) => {
    if (!SITE_KEY_PATTERN.test(siteKey)) {
      throw new Error(`계절 관측 키 "${siteKey}"가 "topic/site" 형식이 아닙니다.`);
    }
    validateSeasonEvents(events, `계절 관측 "${siteKey}"`);
  });
  return data;
};

export const loadSeasonObservations = async (filePath) => {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`${filePath} 요청 실패 (HTTP ${response.status})`);
  }
  const data = await response.json();
  return validateSeasonObservations(data);
};

const validateFestival = (festival) => {
  if (!isPlainObject(festival) || !isNonEmptyString(festival.id)) {
    throw new Error("festivals 항목에 비어 있지 않은 문자열 id가 없습니다.");
  }
  const label = `축제 "${festival.id}"`;
  if (!isNonEmptyString(festival.title)) {
    throw new Error(`${label}에 비어 있지 않은 문자열 title이 없습니다.`);
  }
  const startDate = parseIsoDate(festival.startDate);
  const endDate = parseIsoDate(festival.endDate);
  if (startDate === null || endDate === null) {
    throw new Error(`${label}의 startDate/endDate가 유효한 YYYY-MM-DD가 아닙니다.`);
  }
  if (endDate < startDate) {
    throw new Error(`${label}의 endDate가 startDate보다 앞섭니다.`);
  }
  if (!Number.isFinite(festival.lat) || !Number.isFinite(festival.lng)) {
    throw new Error(`${label}의 lat/lng가 숫자가 아닙니다.`);
  }
  if (typeof festival.address !== "string") {
    throw new Error(`${label}의 address가 문자열이 아닙니다.`);
  }
  if (!Array.isArray(festival.topicIds)) {
    throw new Error(`${label}에 topicIds 배열이 없습니다.`);
  }
};

export const validateFestivalData = (data) => {
  if (!isPlainObject(data)) {
    throw new Error("축제 데이터가 객체가 아닙니다.");
  }
  if (!Array.isArray(data.festivals)) {
    throw new Error("축제 데이터에 festivals 배열이 없습니다.");
  }
  data.festivals.forEach(validateFestival);
  return data;
};

export const loadFestivalData = async (filePath) => {
  const response = await fetch(filePath);
  if (!response.ok) {
    throw new Error(`${filePath} 요청 실패 (HTTP ${response.status})`);
  }
  const data = await response.json();
  return validateFestivalData(data);
};
