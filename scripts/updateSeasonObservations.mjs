import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "scripts", "kma-config.json");
const WRITE_FLAG = "--write";
const YEAR_FLAG = "--year";
const INSPECT_FLAG = "--inspect";
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_REDIRECT_MINIMUM = 300;
const HTTP_REDIRECT_EXCLUSIVE_MAXIMUM = 400;
const EXIT_FAILURE = 1;
const MASK = "***";
const OUTPUT_SOURCE_NAME = "기상청 계절관측";
const LINE_PREVIEW_LENGTH = 80;
const HTTPS_PROTOCOL = "https:";
const HTTP_PROTOCOL = "http:";
const LOOPBACK_HOST = "127.0.0.1";
const FIELD_SEPARATORS = { ",": ",", ";": ";", "|": "|", tab: "\t", whitespace: /\s+/ };
const RESPONSE_FORMAT_KEYS = ["fieldSeparator", "observedAtIndex", "ssnIdIndex", "ssnMdIndex", "stationIndex"];
const COMMENT_PREFIX = "#";
const HEADER_TOKEN_SEPARATOR_PATTERN = /[\s,;|]+/;
const OBSERVED_AT_PATTERN = /^(\d{4})-?(\d{2})-?(\d{2})/;
const YEAR_PATTERN = /^\d{4}$/;
const DIGITS_PATTERN = /^\d+$/;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isNonNegativeNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isStringArray = (value) => Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
const isCodeValue = (value) => isNonEmptyString(value) || Number.isInteger(value);
const isEventCode = (value) => value === null
  || (isPlainObject(value) && isCodeValue(value.ssnId) && (value.ssnMd === null || isCodeValue(value.ssnMd)));
const isEventCodeMap = (value) => isPlainObject(value) && Object.values(value).every(isEventCode);
const isSupportedEncoding = (value) => {
  if (!isNonEmptyString(value)) return false;
  try {
    new TextDecoder(value);
    return true;
  } catch {
    return false;
  }
};
const isBoolean = (value) => typeof value === "boolean";
const isFieldSeparatorName = (value) => value === null || (typeof value === "string" && Object.hasOwn(FIELD_SEPARATORS, value));
const isNullOrIndex = (value) => value === null || isNonNegativeInteger(value);
const isResponseFormat = (value) => isPlainObject(value)
  && isFieldSeparatorName(value.fieldSeparator)
  && isStringArray(value.headerColumns)
  && RESPONSE_FORMAT_KEYS.filter((key) => key !== "fieldSeparator").every((key) => isNullOrIndex(value[key]));
const parseUrl = (value) => {
  try {
    return new URL(value);
  } catch {
    return null;
  }
};
const isApiUrl = (value, config) => {
  const url = isNonEmptyString(value) ? parseUrl(value) : null;
  if (url === null) return false;
  if (url.protocol === HTTPS_PROTOCOL) return true;
  return config.allowInsecureApiUrlForTesting === true && url.protocol === HTTP_PROTOCOL && url.hostname === LOOPBACK_HOST;
};

const CONFIG_RULES = [
  ["apiUrl", isApiUrl, "https 주소"],
  ["allowInsecureApiUrlForTesting", isBoolean, "true 또는 false"],
  ["allSeasonsCode", isCodeValue, "문자열 또는 정수"],
  ["authKeyEnvironmentVariable", isNonEmptyString, "비어 있지 않은 문자열"],
  ["topicDataFiles", isStringArray, "비어 있지 않은 문자열 배열"],
  ["outputFile", isNonEmptyString, "비어 있지 않은 문자열"],
  ["requestIntervalMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["retryWaitMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["maxRetries", isNonNegativeInteger, "0 이상의 정수"],
  ["userAgent", isNonEmptyString, "비어 있지 않은 문자열"],
  ["responseEncoding", isSupportedEncoding, "TextDecoder가 지원하는 인코딩 이름"],
  ["eventCodes", isEventCodeMap, "값이 null 또는 { ssnId, ssnMd } 인 객체"],
  ["responseFormat", isResponseFormat, `fieldSeparator는 null 또는 ${Object.keys(FIELD_SEPARATORS).join(" / ")}, 나머지 ${RESPONSE_FORMAT_KEYS.length - 1}개는 null 또는 0 이상의 정수, headerColumns는 비어 있지 않은 문자열 배열인 객체`],
];

const validateConfig = (config) => {
  const problems = CONFIG_RULES
    .filter(([key, isValid]) => !isValid(config[key], config))
    .map(([key, , expectation]) => `${key} (${expectation})`);
  if (problems.length > 0) {
    throw new Error(`kma-config.json의 설정이 올바르지 않습니다: ${problems.join(", ")}`);
  }
};

const parseArguments = (argv) => {
  const options = { shouldWrite: false, year: null, inspectStation: null };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === WRITE_FLAG) {
      options.shouldWrite = true;
    } else if (argument === YEAR_FLAG) {
      index += 1;
      options.year = argv[index];
    } else if (argument === INSPECT_FLAG) {
      index += 1;
      options.inspectStation = argv[index];
    } else {
      throw new Error(`알 수 없는 옵션: ${argument} (사용 가능: ${WRITE_FLAG}, ${YEAR_FLAG} <YYYY>, ${INSPECT_FLAG} <관측소번호>)`);
    }
  }
  options.year = resolveYear(options.year);
  if (options.inspectStation !== null && !/^\d+$/.test(options.inspectStation ?? "")) {
    throw new Error(`${INSPECT_FLAG} 뒤에는 숫자로 된 관측소 번호가 필요합니다.`);
  }
  if (options.inspectStation !== null && options.shouldWrite) {
    throw new Error(`${INSPECT_FLAG}는 파일을 쓰지 않으므로 ${WRITE_FLAG}와 함께 쓸 수 없습니다.`);
  }
  return options;
};

const resolveYear = (yearText) => {
  if (yearText === null) return new Date().getFullYear();
  if (!YEAR_PATTERN.test(yearText ?? "")) {
    throw new Error(`${YEAR_FLAG} 뒤에는 4자리 연도가 필요합니다: ${yearText}`);
  }
  return Number(yearText);
};

const readAuthKey = (config) => {
  const variableName = config.authKeyEnvironmentVariable;
  const authKey = process.env[variableName];
  if (!isNonEmptyString(authKey)) {
    throw new Error(`기상청 API 인증키가 없습니다. 환경 변수 ${variableName}에 인증키를 설정한 뒤 다시 실행하세요. (예: ${variableName}=발급받은키 node scripts/updateSeasonObservations.mjs)`);
  }
  return authKey;
};

const createMasker = (authKey) => {
  const variants = [authKey, encodeURIComponent(authKey)];
  return (text) => variants.reduce((masked, variant) => masked.split(variant).join(MASK), String(text));
};

const buildRequestUrl = (config, authKey, stationNumber, year, withHelp) => {
  const parameters = [
    `stn=${stationNumber}`,
    `ssn=${config.allSeasonsCode}`,
    `tm1=${year}0101`,
    `tm2=${year}1231`,
    ...(withHelp ? ["help=1"] : []),
    `authKey=${encodeURIComponent(authKey)}`,
  ];
  return `${config.apiUrl}?${parameters.join("&")}`;
};

const extractApiMessage = (bodyText) => {
  try {
    const message = JSON.parse(bodyText)?.result?.message;
    return isNonEmptyString(message) ? message : null;
  } catch {
    return null;
  }
};

const isRedirect = (response) => response.status >= HTTP_REDIRECT_MINIMUM && response.status < HTTP_REDIRECT_EXCLUSIVE_MAXIMUM;

const describeFailure = (response, bodyText, maskedUrl) => {
  if (isRedirect(response)) {
    const location = response.headers.get("location");
    const locationText = location === null ? "Location 헤더 없음" : `Location: ${location}`;
    return `기상청 요청이 리다이렉트되어 중단합니다: HTTP ${response.status}, ${locationText} (${maskedUrl}). 인증키가 다른 주소로 전송되지 않도록 따라가지 않습니다. apiUrl 설정을 확인하세요.`;
  }
  const apiMessage = extractApiMessage(bodyText);
  const detail = apiMessage === null ? "" : `, API 메시지: ${apiMessage}`;
  return `기상청 요청 실패: HTTP ${response.status}${detail} (${maskedUrl})`;
};

const describeNetworkError = (error) => {
  const cause = error.cause;
  if (cause === undefined || cause === null) return error.message;
  const code = cause.code === undefined ? "" : `${cause.code} `;
  return `${error.message} (원인: ${code}${cause.message ?? cause})`;
};

const fetchResponse = async (url, config, mask) => {
  try {
    return await fetch(url, { headers: { "User-Agent": config.userAgent }, redirect: "manual" });
  } catch (error) {
    throw new Error(`네트워크 오류: ${mask(describeNetworkError(error))} (${mask(url)})`);
  }
};

const fetchTextWithRetry = async (url, config, mask) => {
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const response = await fetchResponse(url, config, mask);
    const bodyText = new TextDecoder(config.responseEncoding).decode(await response.arrayBuffer());
    if (response.ok) {
      return bodyText;
    }
    const canRetry = response.status === HTTP_TOO_MANY_REQUESTS && attempt < config.maxRetries;
    if (!canRetry) {
      throw new Error(mask(describeFailure(response, bodyText, mask(url))));
    }
    console.warn(`HTTP 429: ${config.retryWaitMilliseconds}ms 후 재시도 (${attempt + 1}/${config.maxRetries})`);
    await sleep(config.retryWaitMilliseconds);
  }
};

const isValidMonthDay = (year, month, day) => {
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
};

const codesMatch = (actual, expected) => {
  const actualText = String(actual).trim();
  const expectedText = String(expected).trim();
  if (DIGITS_PATTERN.test(actualText) && DIGITS_PATTERN.test(expectedText)) {
    return Number(actualText) === Number(expectedText);
  }
  return actualText === expectedText;
};

const parseObservationLine = (line, responseFormat, stationNumber, year) => {
  const fields = line.split(FIELD_SEPARATORS[responseFormat.fieldSeparator]).map((field) => field.trim());
  if (fields.length > 1 && fields[fields.length - 1] === "") {
    fields.pop();
  }
  const requiredFieldCount = Math.max(...RESPONSE_FORMAT_KEYS
    .filter((key) => key !== "fieldSeparator")
    .map((key) => responseFormat[key])) + 1;
  if (fields.length < requiredFieldCount) {
    throw new Error(`필드가 ${fields.length}개뿐이라 ${requiredFieldCount}개가 필요한 형식과 맞지 않습니다`);
  }
  const match = OBSERVED_AT_PATTERN.exec(fields[responseFormat.observedAtIndex]);
  if (match === null) {
    throw new Error(`관측일 필드를 날짜로 읽을 수 없습니다: ${fields[responseFormat.observedAtIndex]}`);
  }
  const [, rowYear, month, day] = match;
  if (Number(rowYear) !== year) {
    throw new Error(`요청한 ${year}년이 아닌 ${rowYear}년 자료입니다`);
  }
  if (!isValidMonthDay(year, Number(month), Number(day))) {
    throw new Error(`존재하지 않는 날짜입니다: ${month}-${day}`);
  }
  if (!codesMatch(fields[responseFormat.stationIndex], stationNumber)) {
    throw new Error(`요청한 관측소 ${stationNumber}이 아닌 ${fields[responseFormat.stationIndex]} 자료입니다`);
  }
  return {
    ssnId: fields[responseFormat.ssnIdIndex],
    ssnMd: fields[responseFormat.ssnMdIndex],
    monthDay: `${month}-${day}`,
  };
};

const parseObservationRows = (bodyText, responseFormat, stationNumber, year) => {
  const rows = [];
  for (const [lineIndex, line] of bodyText.split(/\r?\n/).entries()) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith(COMMENT_PREFIX)) continue;
    try {
      rows.push(parseObservationLine(trimmed, responseFormat, stationNumber, year));
    } catch (error) {
      throw new Error(`${lineIndex + 1}번째 줄 오류: ${error.message} (${trimmed.slice(0, LINE_PREVIEW_LENGTH)})`);
    }
  }
  return rows;
};

const hasExpectedHeaderLine = (bodyText, headerColumns) => bodyText.split(/\r?\n/).some((line) => {
  const trimmed = line.trim();
  if (!trimmed.startsWith(COMMENT_PREFIX)) return false;
  const tokens = trimmed.slice(COMMENT_PREFIX.length).split(HEADER_TOKEN_SEPARATOR_PATTERN);
  return headerColumns.every((column) => tokens.includes(column));
});

const parseStationBody = (bodyText, config, stationNumber, year) => {
  const apiMessage = extractApiMessage(bodyText);
  if (apiMessage !== null) {
    throw new Error(`관측소 ${stationNumber}: HTTP 200이지만 API가 오류를 돌려줬습니다: ${apiMessage}`);
  }
  let rows;
  try {
    rows = parseObservationRows(bodyText, config.responseFormat, stationNumber, year);
  } catch (error) {
    throw new Error(`관측소 ${stationNumber}: ${error.message}`);
  }
  if (rows.length === 0 && hasExpectedHeaderLine(bodyText, config.responseFormat.headerColumns)) {
    return rows;
  }
  if (rows.length === 0) {
    throw new Error(`관측소 ${stationNumber}: 응답에 자료 행이 없습니다. 기존 관측값을 지키기 위해 중단합니다. ${INSPECT_FLAG} ${stationNumber} --year ${year} 로 원본 응답을 확인하세요.`);
  }
  return rows;
};

const findEventDate = (rows, eventCode) => {
  const matchedDates = rows
    .filter((row) => codesMatch(row.ssnId, eventCode.ssnId)
      && (eventCode.ssnMd === null || codesMatch(row.ssnMd, eventCode.ssnMd)))
    .map((row) => row.monthDay)
    .sort();
  return matchedDates[0] ?? null;
};

const collectSites = async (config) => {
  const sites = [];
  for (const dataFile of config.topicDataFiles) {
    const data = await readJson(path.join(PROJECT_ROOT, dataFile));
    for (const site of data.sites) {
      if (site.seasonalNormal) {
        sites.push({ topicId: data.topic.id, site, normal: site.seasonalNormal });
      }
    }
  }
  return sites;
};

const lookupKeyOf = (normal, eventName) => `${normal.item}/${eventName}`;

const collectLookupKeys = (sites) => [...new Set(
  sites.flatMap(({ normal }) => normal.events.map((event) => lookupKeyOf(normal, event.name))),
)];

const listUnconfirmedSettings = (config) => {
  const eventCodeKeys = Object.entries(config.eventCodes)
    .filter(([, code]) => code === null)
    .map(([key]) => key);
  const responseFormatKeys = RESPONSE_FORMAT_KEYS.filter((key) => config.responseFormat[key] === null);
  return { eventCodeKeys, responseFormatKeys };
};

const validateEventCodes = (config, sites) => {
  const unknownKeys = collectLookupKeys(sites).filter((key) => !(key in config.eventCodes));
  if (unknownKeys.length > 0) {
    throw new Error(`kma-config.json의 eventCodes에 없는 항목: ${unknownKeys.join(", ")}`);
  }
  const { eventCodeKeys, responseFormatKeys } = listUnconfirmedSettings(config);
  if (eventCodeKeys.length === 0 && responseFormatKeys.length === 0) return;
  const lines = ["아직 확정되지 않은 설정이 있어 실행할 수 없습니다:"];
  if (eventCodeKeys.length > 0) {
    lines.push(`  eventCodes: ${eventCodeKeys.join(", ")}`);
  }
  if (responseFormatKeys.length > 0) {
    lines.push(`  responseFormat: ${responseFormatKeys.join(", ")}`);
  }
  lines.push(`먼저 ${INSPECT_FLAG} <관측소번호> --year <YYYY> 로 응답을 확인하고 kma-config.json의 eventCodes( { "ssnId": ..., "ssnMd": ... } 형태)와 responseFormat 값을 채우세요.`);
  throw new Error(lines.join("\n"));
};

const collectStationNumbers = (sites) => [...new Set(sites.map(({ normal }) => String(normal.stationNumber)))];

const fetchStationRows = async (stationNumbers, config, authKey, year, mask) => {
  const rowsByStation = new Map();
  for (const [index, stationNumber] of stationNumbers.entries()) {
    if (index > 0) {
      await sleep(config.requestIntervalMilliseconds);
    }
    const url = buildRequestUrl(config, authKey, stationNumber, year, false);
    const bodyText = await fetchTextWithRetry(url, config, mask);
    const rows = parseStationBody(bodyText, config, stationNumber, year);
    if (rows.length === 0) {
      console.warn(`경고: 관측소 ${stationNumber}는 ${year}년 관측 자료가 없습니다(관측 없음). 해당 관측소의 지점은 이벤트 없이 처리합니다.`);
    }
    rowsByStation.set(stationNumber, rows);
  }
  return rowsByStation;
};

const observeSite = ({ topicId, site, normal }, rowsByStation, config) => {
  const rows = rowsByStation.get(String(normal.stationNumber));
  const observed = [];
  for (const event of normal.events) {
    const date = findEventDate(rows, config.eventCodes[lookupKeyOf(normal, event.name)]);
    if (date !== null) {
      observed.push({ name: event.name, date });
    }
  }
  observed.sort((first, second) => first.date.localeCompare(second.date));
  return { topicId, site, normal, observed };
};

const printSite = ({ topicId, site, normal, observed }) => {
  const proxyLabel = normal.isProxy ? " (대체 관측소)" : "";
  console.log(`[${topicId}/${site.id}] ${site.name}`);
  console.log(`  관측소: ${normal.stationName}(${normal.stationNumber})${proxyLabel}, 항목: ${normal.item}`);
  console.log(`  기대 이벤트: ${normal.events.map((event) => event.name).join(", ")}`);
  const observedText = observed.length === 0
    ? "관측 없음"
    : observed.map((event) => `${event.name} ${event.date}`).join(", ");
  console.log(`  관측: ${observedText}`);
};

const printSummary = (results, stationCount, emptyStationNumbers, year, shouldWrite) => {
  const observedSites = results.filter((result) => result.observed.length > 0).length;
  const observedEvents = results.reduce((sum, result) => sum + result.observed.length, 0);
  console.log("");
  console.log(`요약: ${year}년, 관측소 ${stationCount}곳 조회, 지점 ${results.length}곳 중 ${observedSites}곳에서 이벤트 ${observedEvents}건 관측`);
  if (emptyStationNumbers.length > 0) {
    console.log(`관측 자료가 없는 관측소: ${emptyStationNumbers.join(", ")}`);
  }
  if (!shouldWrite) {
    console.log(`드라이런이므로 파일을 쓰지 않았습니다. 반영하려면 ${WRITE_FLAG} 옵션으로 실행하세요.`);
  }
};

const formatTodayDate = () => {
  const today = new Date();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${today.getFullYear()}-${month}-${day}`;
};

const buildOutput = (results, year) => {
  const sites = {};
  for (const { topicId, site, observed } of results) {
    if (observed.length > 0) {
      sites[`${topicId}/${site.id}`] = observed;
    }
  }
  return { source: OUTPUT_SOURCE_NAME, year, updatedAt: formatTodayDate(), sites };
};

const readExistingOutput = async (outputPath) => {
  try {
    return await readJson(outputPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

const countEvents = (sites) => Object.values(isPlainObject(sites) ? sites : {})
  .reduce((sum, events) => sum + (Array.isArray(events) ? events.length : 0), 0);

const assertNotEmptyingExistingOutput = (existing, output, outputFile) => {
  if (existing !== null && countEvents(existing.sites) > 0 && countEvents(output.sites) === 0) {
    throw new Error(`${outputFile}에 ${existing.year}년 이벤트 ${countEvents(existing.sites)}건이 있는데 새 결과(${output.year}년)는 0건이라 덮어쓰지 않고 중단합니다. eventCodes와 responseFormat 설정을 확인하세요.`);
  }
};

const writeOutput = async (config, output) => {
  const outputPath = path.join(PROJECT_ROOT, config.outputFile);
  assertNotEmptyingExistingOutput(await readExistingOutput(outputPath), output, config.outputFile);
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(output, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
  console.log(`${config.outputFile} 파일을 저장했습니다.`);
};

const runInspect = async (config, authKey, options, mask) => {
  const url = buildRequestUrl(config, authKey, options.inspectStation, options.year, true);
  console.log(`관측소 ${options.inspectStation}, ${options.year}년 전체 계절 응답 (${mask(url)})`);
  const bodyText = await fetchTextWithRetry(url, config, mask);
  console.log(mask(bodyText));
};

const runUpdate = async (config, authKey, options, mask) => {
  const sites = await collectSites(config);
  if (sites.length === 0) {
    throw new Error("seasonalNormal이 있는 지점이 없습니다.");
  }
  validateEventCodes(config, sites);
  const stationNumbers = collectStationNumbers(sites);
  const rowsByStation = await fetchStationRows(stationNumbers, config, authKey, options.year, mask);
  const results = sites.map((entry) => observeSite(entry, rowsByStation, config));
  results.forEach(printSite);
  const emptyStationNumbers = stationNumbers.filter((stationNumber) => rowsByStation.get(stationNumber).length === 0);
  printSummary(results, stationNumbers.length, emptyStationNumbers, options.year, options.shouldWrite);
  if (options.shouldWrite) {
    await writeOutput(config, buildOutput(results, options.year));
  }
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const config = await readJson(CONFIG_PATH);
  validateConfig(config);
  const authKey = readAuthKey(config);
  const mask = createMasker(authKey);
  try {
    if (options.inspectStation !== null) {
      await runInspect(config, authKey, options, mask);
    } else {
      await runUpdate(config, authKey, options, mask);
    }
  } catch (error) {
    throw new Error(mask(error.message));
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = EXIT_FAILURE;
});
