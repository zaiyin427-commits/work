import {
  MONTH_MIN,
  MONTH_MAX,
  ISO_DATE_PATTERN,
  LATITUDE_LIMIT,
  LONGITUDE_LIMIT,
} from "./config.js";
import { getDaysInMonth } from "./dateUtils.js";
import { parseMonthDay } from "./seasonStatus.js";

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

const isValidIsoDate = (text) => {
  const match = typeof text === "string" ? ISO_DATE_PATTERN.exec(text) : null;
  if (match === null) {
    return false;
  }
  const [year, month, day] = match.slice(1).map(Number);
  return isValidMonth(month) && day >= 1 && day <= getDaysInMonth(year, month - 1);
};

const isWithinLimit = (value, limit) =>
  Number.isFinite(value) && Math.abs(value) <= limit;

const REAL_TRACK_STRING_FIELDS = ["speciesId", "speciesName", "individualName", "season"];

const REAL_TRACK_SOURCE_FIELDS = ["name", "citation", "doi", "license", "licenseUrl"];

const validateRealTrackPoint = (point, index, previousPoint) => {
  const label = `points[${index}]`;
  if (!Array.isArray(point) || point.length !== 3) {
    throw new Error(`${label}가 [날짜, 위도, 경도] 형식이 아닙니다.`);
  }
  const [date, lat, lng] = point;
  if (!isValidIsoDate(date)) {
    throw new Error(`${label}의 날짜 "${date}"가 유효한 YYYY-MM-DD가 아닙니다.`);
  }
  if (!isWithinLimit(lat, LATITUDE_LIMIT) || !isWithinLimit(lng, LONGITUDE_LIMIT)) {
    throw new Error(`${label}의 위도/경도가 유효한 숫자 범위를 벗어났습니다.`);
  }
  if (previousPoint !== undefined && date <= previousPoint[0]) {
    throw new Error(`${label}의 날짜 "${date}"가 이전 점보다 늦지 않아 시간순이 아니거나 중복입니다.`);
  }
};

export const validateRealTrack = (data) => {
  if (!isPlainObject(data)) {
    throw new Error("실제 추적 데이터가 객체가 아닙니다.");
  }
  REAL_TRACK_STRING_FIELDS.forEach((field) => {
    if (!isNonEmptyString(data[field])) {
      throw new Error(`실제 추적 데이터에 비어 있지 않은 문자열 ${field}이(가) 없습니다.`);
    }
  });
  if (!Number.isFinite(data.precisionDegrees) || data.precisionDegrees <= 0) {
    throw new Error("실제 추적 데이터의 precisionDegrees가 0보다 큰 숫자가 아닙니다.");
  }
  if (!isPlainObject(data.source)) {
    throw new Error("실제 추적 데이터에 source 객체가 없습니다.");
  }
  REAL_TRACK_SOURCE_FIELDS.forEach((field) => {
    if (!isNonEmptyString(data.source[field])) {
      throw new Error(`실제 추적 데이터의 source에 비어 있지 않은 문자열 ${field}이(가) 없습니다.`);
    }
  });
  if (!Array.isArray(data.points)) {
    throw new Error("실제 추적 데이터에 points 배열이 없습니다.");
  }
  data.points.forEach((point, index) =>
    validateRealTrackPoint(point, index, data.points[index - 1]),
  );
  return data;
};

export const loadRealTrack = async (trackConfig) => {
  const response = await fetch(trackConfig.dataFile);
  if (!response.ok) {
    throw new Error(`${trackConfig.dataFile} 요청 실패 (HTTP ${response.status})`);
  }
  const data = await response.json();
  return { topicId: trackConfig.topicId, data: validateRealTrack(data) };
};
