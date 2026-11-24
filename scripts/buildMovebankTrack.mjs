import { readFile, rename, writeFile } from "node:fs/promises";
import { setTimeout as sleep } from "node:timers/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "scripts", "movebank-config.json");
const CONFIG_NAME = "movebank-config.json";
const WRITE_FLAG = "--write";
const EXIT_FAILURE = 1;
const DATE_LENGTH = 10;
const MONTH_FIRST = 1;
const MONTH_LAST = 12;
const LATITUDE_LIMIT = 90;
const LONGITUDE_LIMIT = 180;
const SUMMARY_SOUTH_OF_LATITUDE = 40;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const REQUIRED_COLUMNS = [
  "timestamp",
  "location-long",
  "location-lat",
  "manually-marked-outlier",
  "visible",
  "individual-local-identifier",
];

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isPositiveNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isHttpsUrl = (value) => isNonEmptyString(value) && URL.canParse(value) && new URL(value).protocol === "https:";
const isRealCalendarDate = (value) => {
  const timestamp = Date.parse(value);
  return !Number.isNaN(timestamp) && new Date(timestamp).toISOString().slice(0, DATE_LENGTH) === value;
};
const isIsoDate = (value) => typeof value === "string" && DATE_PATTERN.test(value) && isRealCalendarDate(value);
const isMonthList = (value) => Array.isArray(value)
  && value.every((month) => Number.isInteger(month) && month >= MONTH_FIRST && month <= MONTH_LAST);

const SOURCE_RULES = [
  ["name", isNonEmptyString, "비어 있지 않은 문자열"],
  ["citation", isNonEmptyString, "비어 있지 않은 문자열"],
  ["doi", isNonEmptyString, "비어 있지 않은 문자열"],
  ["license", isNonEmptyString, "비어 있지 않은 문자열"],
  ["licenseUrl", isHttpsUrl, "https 주소"],
];

const CONFIG_RULES = [
  ["dataUrl", isHttpsUrl, "https 주소"],
  ["outputFile", isNonEmptyString, "비어 있지 않은 문자열"],
  ["speciesId", isNonEmptyString, "비어 있지 않은 문자열"],
  ["speciesName", isNonEmptyString, "비어 있지 않은 문자열"],
  ["individualId", isNonEmptyString, "비어 있지 않은 문자열"],
  ["individualName", isNonEmptyString, "비어 있지 않은 문자열"],
  ["seasonStart", isIsoDate, "YYYY-MM-DD 날짜"],
  ["seasonEnd", isIsoDate, "YYYY-MM-DD 날짜"],
  ["excludedMonths", isMonthList, "1~12 정수의 배열"],
  ["precisionDegrees", isPositiveNumber, "0보다 큰 숫자"],
  ["userAgent", isNonEmptyString, "비어 있지 않은 문자열"],
  ["downloadChunkBytes", isPositiveInteger, "양의 정수"],
  ["maxChunkRetries", isNonNegativeInteger, "0 이상의 정수"],
  ["source", isPlainObject, "객체"],
];

const findProblems = (target, rules) => rules
  .filter(([key, isValid]) => !isValid(target[key]))
  .map(([key, , expectation]) => `${key} (${expectation})`);

const validateConfig = (config) => {
  const problems = findProblems(config, CONFIG_RULES);
  if (isPlainObject(config.source)) {
    problems.push(...findProblems(config.source, SOURCE_RULES).map((problem) => `source.${problem}`));
  }
  if (isIsoDate(config.seasonStart) && isIsoDate(config.seasonEnd) && config.seasonStart > config.seasonEnd) {
    problems.push("seasonStart는 seasonEnd보다 늦을 수 없습니다");
  }
  if (problems.length > 0) {
    throw new Error(`${CONFIG_NAME}의 설정이 올바르지 않습니다: ${problems.join(", ")}`);
  }
};

const loadConfig = async () => {
  const configText = await readFile(CONFIG_PATH, "utf8");
  const config = JSON.parse(configText);
  validateConfig(config);
  return config;
};

const HTTP_PARTIAL_CONTENT = 206;
const CONTENT_RANGE_PATTERN = /^bytes (\d+)-(\d+)\/(\d+)$/;
const RETRY_DELAY_MILLISECONDS = 1000;

const rejectResponse = async (response, message) => {
  await response.body?.cancel();
  throw new Error(message);
};

const requestRange = async (config, start, expectedTotalBytes) => {
  const requestedEnd = start + config.downloadChunkBytes - 1;
  let response;
  try {
    response = await fetch(config.dataUrl, {
      headers: { "User-Agent": config.userAgent, Range: `bytes=${start}-${requestedEnd}` },
      redirect: "error",
    });
  } catch (error) {
    throw new Error(`네트워크 오류: ${error.message} (${config.dataUrl})`);
  }
  if (response.status !== HTTP_PARTIAL_CONTENT) {
    await rejectResponse(response, `Movebank 데이터 요청 실패: HTTP ${response.status}, 구간 요청(206)이 필요합니다 (${config.dataUrl})`);
  }
  const contentRange = response.headers.get("content-range") ?? "";
  const rangeMatch = CONTENT_RANGE_PATTERN.exec(contentRange);
  if (!rangeMatch) {
    await rejectResponse(response, `Content-Range 헤더가 올바르지 않습니다: ${contentRange}`);
  }
  const [rangeStart, rangeEnd, totalBytes] = rangeMatch.slice(1).map(Number);
  if (rangeStart !== start || rangeEnd < rangeStart || rangeEnd > requestedEnd || rangeEnd >= totalBytes) {
    await rejectResponse(response, `Content-Range 범위가 요청과 맞지 않습니다: ${contentRange} (요청 시작 ${start})`);
  }
  if (expectedTotalBytes !== undefined && totalBytes !== expectedTotalBytes) {
    await rejectResponse(response, `전체 크기가 구간마다 다릅니다: 처음 ${expectedTotalBytes}바이트, 이번 ${totalBytes}바이트 (파일이 다운로드 중에 바뀌었을 수 있습니다)`);
  }
  const body = Buffer.from(await response.arrayBuffer());
  const expectedLength = rangeEnd - start + 1;
  if (body.length !== expectedLength) {
    throw new Error(`구간 길이가 맞지 않습니다: 기대 ${expectedLength}바이트, 실제 ${body.length}바이트`);
  }
  return { body, totalBytes };
};

const requestRangeWithRetry = async (config, start, expectedTotalBytes) => {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await requestRange(config, start, expectedTotalBytes);
    } catch (error) {
      if (attempt >= config.maxChunkRetries) {
        throw error;
      }
      const delayMilliseconds = RETRY_DELAY_MILLISECONDS * (attempt + 1);
      console.warn(`구간 ${start} 요청 실패, ${delayMilliseconds}ms 후 재시도 (${attempt + 1}/${config.maxChunkRetries}): ${error.message}`);
      await sleep(delayMilliseconds);
    }
  }
};

const downloadCsv = async (config) => {
  const chunks = [];
  let received = 0;
  let totalBytes;
  while (totalBytes === undefined || received < totalBytes) {
    const chunk = await requestRangeWithRetry(config, received, totalBytes);
    chunks.push(chunk.body);
    received += chunk.body.length;
    totalBytes = chunk.totalBytes;
  }
  return Buffer.concat(chunks).toString("utf8");
};

const parseCsvRows = function* (text) {
  let row = [];
  let field = "";
  let isQuoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (isQuoted) {
      if (character !== '"') {
        field += character;
      } else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else {
        isQuoted = false;
      }
    } else if (character === '"') {
      isQuoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\n") {
      row.push(field.endsWith("\r") ? field.slice(0, -1) : field);
      field = "";
      yield row;
      row = [];
    } else {
      field += character;
    }
  }
  if (isQuoted) {
    throw new Error("CSV의 따옴표가 닫히지 않았습니다. 다운로드가 잘렸는지 확인하세요.");
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    yield row;
  }
};

const findColumnIndexes = (headerRow) => {
  const missing = REQUIRED_COLUMNS.filter((name) => !headerRow.includes(name));
  if (missing.length > 0) {
    throw new Error(`CSV에 필요한 열이 없습니다: ${missing.join(", ")}`);
  }
  return Object.fromEntries(REQUIRED_COLUMNS.map((name) => [name, headerRow.indexOf(name)]));
};

const isUsableFix = (row, columns, config) => {
  if (row[columns["individual-local-identifier"]] !== config.individualId) return false;
  if (row[columns.visible] === "false") return false;
  if (row[columns["manually-marked-outlier"]] === "true") return false;
  return true;
};

const parseFix = (row, columns) => {
  const latitude = Number(row[columns["location-lat"]]);
  const longitude = Number(row[columns["location-long"]]);
  const date = row[columns.timestamp].slice(0, DATE_LENGTH);
  const hasCoordinates = row[columns["location-lat"]] !== "" && row[columns["location-long"]] !== "";
  const isValid = hasCoordinates
    && DATE_PATTERN.test(date)
    && Number.isFinite(latitude) && Math.abs(latitude) <= LATITUDE_LIMIT
    && Number.isFinite(longitude) && Math.abs(longitude) <= LONGITUDE_LIMIT;
  return isValid ? { date, latitude, longitude } : null;
};

const monthOf = (date) => Number(date.slice(5, 7));

const isInSeason = (date, config) => date >= config.seasonStart
  && date <= config.seasonEnd
  && !config.excludedMonths.includes(monthOf(date));

const collectFixesByDate = (csvText, config) => {
  const rows = parseCsvRows(csvText);
  const header = rows.next();
  if (header.done) {
    throw new Error("CSV가 비어 있습니다.");
  }
  const columns = findColumnIndexes(header.value);
  const fixesByDate = new Map();
  let individualRowCount = 0;
  for (const row of rows) {
    if (row.length <= Math.max(...Object.values(columns))) continue;
    if (row[columns["individual-local-identifier"]] === config.individualId) {
      individualRowCount += 1;
    }
    if (!isUsableFix(row, columns, config)) continue;
    const fix = parseFix(row, columns);
    if (!fix || !isInSeason(fix.date, config)) continue;
    if (!fixesByDate.has(fix.date)) {
      fixesByDate.set(fix.date, []);
    }
    fixesByDate.get(fix.date).push(fix);
  }
  if (individualRowCount === 0) {
    throw new Error(`CSV에서 개체 ${config.individualId}의 행을 찾지 못했습니다.`);
  }
  return fixesByDate;
};

const median = (values) => {
  const sorted = [...values].sort((first, second) => first - second);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const decimalPlacesOf = (value) => (String(value).split(".")[1] ?? "").length;

const roundToPrecision = (value, precisionDegrees) => Number(
  (Math.round(value / precisionDegrees) * precisionDegrees).toFixed(decimalPlacesOf(precisionDegrees)),
);

const buildPoints = (fixesByDate, config) => [...fixesByDate.keys()].sort().map((date) => {
  const fixes = fixesByDate.get(date);
  return [
    date,
    roundToPrecision(median(fixes.map((fix) => fix.latitude)), config.precisionDegrees),
    roundToPrecision(median(fixes.map((fix) => fix.longitude)), config.precisionDegrees),
  ];
});

const buildSeasonLabel = (config) => `${config.seasonStart.slice(0, 4)}-${config.seasonEnd.slice(0, 4)}`;

const buildTrack = (points, config) => ({
  speciesId: config.speciesId,
  speciesName: config.speciesName,
  individualName: config.individualName,
  season: buildSeasonLabel(config),
  precisionDegrees: config.precisionDegrees,
  source: config.source,
  points,
});

const formatTrackText = (track) => {
  const { points, ...header } = track;
  const headerText = JSON.stringify(header, null, 2).slice(0, -2);
  const pointLines = points.map((point) => `    ${JSON.stringify(point)}`).join(",\n");
  return `${headerText},\n  "points": [\n${pointLines}\n  ]\n}\n`;
};

const writeAtomically = async (filePath, text) => {
  const temporaryPath = `${filePath}.tmp`;
  await writeFile(temporaryPath, text);
  await rename(temporaryPath, filePath);
};

const printSummary = (points, config, shouldWrite) => {
  const latitudes = points.map(([, latitude]) => latitude);
  const longitudes = points.map(([, , longitude]) => longitude);
  const southPoints = points.filter(([, latitude]) => latitude < SUMMARY_SOUTH_OF_LATITUDE);
  console.log(`개체: ${config.individualName} (${config.individualId}) / 시즌 ${buildSeasonLabel(config)}`);
  console.log(`일수: ${points.length}일`);
  console.log(`첫 날짜: ${points[0][0]} / 마지막 날짜: ${points[points.length - 1][0]}`);
  if (southPoints.length > 0) {
    console.log(`북위 ${SUMMARY_SOUTH_OF_LATITUDE}도 이남 첫 날짜: ${southPoints[0][0]} / 마지막 날짜: ${southPoints[southPoints.length - 1][0]}`);
  } else {
    console.log(`북위 ${SUMMARY_SOUTH_OF_LATITUDE}도 이남 날짜가 없습니다.`);
  }
  console.log(`위도 범위: ${Math.min(...latitudes)} ~ ${Math.max(...latitudes)}`);
  console.log(`경도 범위: ${Math.min(...longitudes)} ~ ${Math.max(...longitudes)}`);
  if (!shouldWrite) {
    console.log("드라이런이므로 파일을 쓰지 않았습니다. 반영하려면 --write 옵션으로 실행하세요.");
  }
};

const main = async () => {
  const shouldWrite = process.argv.includes(WRITE_FLAG);
  const config = await loadConfig();
  const csvText = await downloadCsv(config);
  const fixesByDate = collectFixesByDate(csvText, config);
  const points = buildPoints(fixesByDate, config);
  if (points.length === 0) {
    throw new Error("시즌 범위에 해당하는 위치 기록이 없습니다. 설정(individualId, seasonStart, seasonEnd)을 확인하세요.");
  }
  printSummary(points, config, shouldWrite);
  if (shouldWrite) {
    await writeAtomically(path.join(PROJECT_ROOT, config.outputFile), formatTrackText(buildTrack(points, config)));
    console.log(`${config.outputFile} 파일을 저장했습니다.`);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = EXIT_FAILURE;
});
