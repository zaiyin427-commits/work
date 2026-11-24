import { readFile, rename, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "scripts", "tourapi-config.json");
const WRITE_FLAG = "--write";
const HTTP_TOO_MANY_REQUESTS = 429;
const HTTP_SERVER_ERROR_MINIMUM = 500;
const HTTP_REDIRECT_MINIMUM = 300;
const HTTP_REDIRECT_EXCLUSIVE_MAXIMUM = 400;
const EXIT_FAILURE = 1;
const MASK = "***";
const HTTPS_PROTOCOL = "https:";
const HTTP_PROTOCOL = "http:";
const LOOPBACK_HOST = "127.0.0.1";
const SUCCESS_RESULT_CODE = "0000";
const RESPONSE_PREVIEW_LENGTH = 200;
const SAMPLE_TITLE_LIMIT = 5;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
const SEOUL_TIME_ZONE = "Asia/Seoul";
const DATE_PATTERN = /^(\d{4})(\d{2})(\d{2})$/;

const DROP_REASONS = {
  missingIdOrTitle: "id 또는 제목 없음",
  invalidDate: "날짜가 없거나 올바르지 않음",
  endBeforeStart: "종료일이 시작일보다 빠름",
  yearRound: "연중 행사",
  invalidCoordinates: "좌표가 없거나 한국 범위 밖",
  noTopicMatch: "주제 키워드 불일치",
  duplicate: "id 중복",
};

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isNonNegativeNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isBoolean = (value) => typeof value === "boolean";
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isStringArray = (value) => Array.isArray(value) && value.length > 0 && value.every(isNonEmptyString);
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
const isFiniteNumber = (value) => typeof value === "number" && Number.isFinite(value);
const isKoreaBounds = (value) => isPlainObject(value)
  && ["minLat", "maxLat", "minLng", "maxLng"].every((key) => isFiniteNumber(value[key]))
  && value.minLat < value.maxLat
  && value.minLng < value.maxLng;
const isTopicKeywords = (value) => isPlainObject(value)
  && Object.keys(value).length > 0
  && Object.values(value).every(isStringArray);
const isSource = (value) => isPlainObject(value) && isNonEmptyString(value.name) && isNonEmptyString(value.url);

const CONFIG_RULES = [
  ["apiUrl", isApiUrl, "https 주소"],
  ["allowInsecureApiUrlForTesting", isBoolean, "true 또는 false"],
  ["authKeyEnvironmentVariable", isNonEmptyString, "비어 있지 않은 문자열"],
  ["mobileOS", isNonEmptyString, "비어 있지 않은 문자열"],
  ["mobileApp", isNonEmptyString, "비어 있지 않은 문자열"],
  ["userAgent", isNonEmptyString, "비어 있지 않은 문자열"],
  ["eventStartLookbackYears", isNonNegativeInteger, "0 이상의 정수"],
  ["rowsPerPage", isPositiveInteger, "1 이상의 정수"],
  ["maxPages", isPositiveInteger, "1 이상의 정수"],
  ["requestIntervalMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["requestTimeoutMilliseconds", isPositiveInteger, "1 이상의 정수"],
  ["maxRetries", isNonNegativeInteger, "0 이상의 정수"],
  ["retryWaitMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["outputFile", isNonEmptyString, "비어 있지 않은 문자열"],
  ["yearRoundMinimumDays", isPositiveInteger, "1 이상의 정수"],
  ["koreaBounds", isKoreaBounds, "minLat < maxLat, minLng < maxLng 인 숫자 4개를 가진 객체"],
  ["topicKeywords", isTopicKeywords, "값이 비어 있지 않은 문자열 배열인 객체"],
  ["source", isSource, "name과 url이 비어 있지 않은 문자열인 객체"],
];

const validateConfig = (config) => {
  const problems = CONFIG_RULES
    .filter(([key, isValid]) => !isValid(config[key], config))
    .map(([key, , expectation]) => `${key} (${expectation})`);
  if (problems.length > 0) {
    throw new Error(`tourapi-config.json의 설정이 올바르지 않습니다: ${problems.join(", ")}`);
  }
};

const parseArguments = (argv) => {
  const options = { shouldWrite: false };
  for (const argument of argv) {
    if (argument === WRITE_FLAG) {
      options.shouldWrite = true;
    } else {
      throw new Error(`알 수 없는 옵션: ${argument} (사용 가능: ${WRITE_FLAG})`);
    }
  }
  return options;
};

const readAuthKey = (config) => {
  const variableName = config.authKeyEnvironmentVariable;
  const authKey = process.env[variableName];
  if (!isNonEmptyString(authKey)) {
    throw new Error(`TourAPI 인증키가 없습니다. 환경 변수 ${variableName}에 인증키를 설정한 뒤 다시 실행하세요. (예: ${variableName}=발급받은키 node scripts/buildFestivals.mjs)`);
  }
  return authKey;
};

const createMasker = (authKey) => {
  const variants = [authKey, encodeURIComponent(authKey), new URLSearchParams({ k: authKey }).toString().slice(2)];
  return (text) => variants.reduce((masked, variant) => masked.split(variant).join(MASK), String(text));
};

const SEOUL_DATE_FORMATTER = new Intl.DateTimeFormat("en-US", {
  timeZone: SEOUL_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const getSeoulDateParts = () => {
  const parts = Object.fromEntries(SEOUL_DATE_FORMATTER.formatToParts(new Date()).map(({ type, value }) => [type, value]));
  return { year: Number(parts.year), month: Number(parts.month), day: Number(parts.day) };
};

const formatDateParts = ({ year, month, day }) => [
  String(year).padStart(4, "0"),
  String(month).padStart(2, "0"),
  String(day).padStart(2, "0"),
].join("-");

const formatSeoulToday = () => formatDateParts(getSeoulDateParts());

const resolveEventStartYear = (config) => getSeoulDateParts().year - config.eventStartLookbackYears;

const buildRequestUrl = (config, authKey, eventStartYear, pageNumber) => {
  const parameters = new URLSearchParams({
    serviceKey: authKey,
    MobileOS: config.mobileOS,
    MobileApp: config.mobileApp,
    _type: "json",
    eventStartDate: `${eventStartYear}0101`,
    numOfRows: String(config.rowsPerPage),
    pageNo: String(pageNumber),
  });
  return `${config.apiUrl}?${parameters.toString()}`;
};

const isRedirect = (response) => response.status >= HTTP_REDIRECT_MINIMUM && response.status < HTTP_REDIRECT_EXCLUSIVE_MAXIMUM;
const isRetryableStatus = (status) => status === HTTP_TOO_MANY_REQUESTS || status >= HTTP_SERVER_ERROR_MINIMUM;
const previewBody = (bodyText) => bodyText.trim().slice(0, RESPONSE_PREVIEW_LENGTH);

const describeNetworkError = (error) => {
  const cause = error.cause;
  if (cause === undefined || cause === null) return error.message;
  const code = cause.code === undefined ? "" : `${cause.code} `;
  return `${error.message} (원인: ${code}${cause.message ?? cause})`;
};

const describeRedirect = (response, maskedUrl) => {
  const location = response.headers.get("location");
  const locationText = location === null ? "Location 헤더 없음" : `Location: ${location}`;
  return `TourAPI 요청이 리다이렉트되어 중단합니다: HTTP ${response.status}, ${locationText} (${maskedUrl}). 인증키가 다른 주소로 전송되지 않도록 따라가지 않습니다. apiUrl 설정을 확인하세요.`;
};

const requestOnce = async (url, config, mask) => {
  let response;
  let bodyText;
  try {
    response = await fetch(url, {
      headers: { "User-Agent": config.userAgent },
      redirect: "manual",
      signal: AbortSignal.timeout(config.requestTimeoutMilliseconds),
    });
    bodyText = await response.text();
  } catch (error) {
    return { retryReason: `네트워크 오류: ${mask(describeNetworkError(error))}` };
  }
  if (isRedirect(response)) {
    throw new Error(describeRedirect(response, mask(url)));
  }
  if (isRetryableStatus(response.status)) {
    return { retryReason: `HTTP ${response.status}` };
  }
  if (!response.ok) {
    throw new Error(`TourAPI 요청 실패: HTTP ${response.status}, 응답: ${mask(previewBody(bodyText))} (${mask(url)})`);
  }
  return { bodyText };
};

const fetchTextWithRetry = async (url, config, mask) => {
  let lastRetryReason = "";
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    if (attempt > 0) {
      const waitMilliseconds = config.retryWaitMilliseconds * attempt;
      console.warn(`${lastRetryReason}: ${waitMilliseconds}ms 후 재시도 (${attempt}/${config.maxRetries})`);
      await sleep(waitMilliseconds);
    }
    const result = await requestOnce(url, config, mask);
    if (result.bodyText !== undefined) {
      return result.bodyText;
    }
    lastRetryReason = result.retryReason;
  }
  throw new Error(`TourAPI 요청이 ${config.maxRetries}번 재시도 후에도 실패했습니다: ${lastRetryReason} (${mask(url)})`);
};

const parseJsonBody = (bodyText) => {
  try {
    return JSON.parse(bodyText);
  } catch {
    throw new Error(`TourAPI 응답이 JSON이 아닙니다(오류 응답일 수 있음): ${previewBody(bodyText)}`);
  }
};

const extractItems = (body) => {
  const item = isPlainObject(body.items) ? body.items.item : undefined;
  if (item === undefined || item === null) return [];
  return Array.isArray(item) ? item : [item];
};

const parsePageBody = (bodyText) => {
  const response = parseJsonBody(bodyText)?.response;
  if (!isPlainObject(response) || !isPlainObject(response.header)) {
    throw new Error(`TourAPI 응답 형식이 예상과 다릅니다: ${previewBody(bodyText)}`);
  }
  const { resultCode, resultMsg } = response.header;
  if (resultCode !== SUCCESS_RESULT_CODE) {
    throw new Error(`TourAPI가 오류를 돌려줬습니다: resultCode ${resultCode}, resultMsg ${resultMsg}`);
  }
  const body = response.body;
  if (!isPlainObject(body)) {
    throw new Error(`TourAPI 응답 형식이 예상과 다릅니다: ${previewBody(bodyText)}`);
  }
  const totalCountText = trimText(body.totalCount);
  const totalCount = totalCountText === "" ? Number.NaN : Number(totalCountText);
  if (!isNonNegativeInteger(totalCount)) {
    throw new Error(`TourAPI 응답의 totalCount가 없거나 올바르지 않습니다: ${previewBody(bodyText)}`);
  }
  return { items: extractItems(body), totalCount };
};

const fetchPage = async (config, authKey, eventStartYear, pageNumber, mask) => {
  const url = buildRequestUrl(config, authKey, eventStartYear, pageNumber);
  const bodyText = await fetchTextWithRetry(url, config, mask);
  try {
    return parsePageBody(bodyText);
  } catch (error) {
    throw new Error(`${pageNumber}쪽: ${error.message}`);
  }
};

const assertPageIsFull = (page, pageNumber, pageCount, config) => {
  if (pageNumber < pageCount && page.items.length < config.rowsPerPage) {
    throw new Error(`${pageNumber}쪽에서 ${config.rowsPerPage}건이 와야 하는데 ${page.items.length}건만 왔습니다. 서버가 건수를 제한했거나 일시적으로 빈 응답을 보냈을 수 있어 중단합니다.`);
  }
};

const assertAllItemsFetched = (items, totalCount) => {
  if (items.length !== totalCount) {
    throw new Error(`전체 ${totalCount}건이라고 했는데 ${items.length}건만 가져와서 일부만 저장되지 않도록 중단합니다.`);
  }
};

const fetchAllItems = async (config, authKey, eventStartYear, mask) => {
  const firstPage = await fetchPage(config, authKey, eventStartYear, 1, mask);
  const pageCount = Math.ceil(firstPage.totalCount / config.rowsPerPage);
  if (pageCount > config.maxPages) {
    throw new Error(`전체 ${firstPage.totalCount}건은 ${pageCount}쪽이라 maxPages(${config.maxPages})를 넘습니다. 설정을 확인하세요.`);
  }
  assertPageIsFull(firstPage, 1, pageCount, config);
  const items = [...firstPage.items];
  for (let pageNumber = 2; pageNumber <= pageCount; pageNumber += 1) {
    await sleep(config.requestIntervalMilliseconds);
    const page = await fetchPage(config, authKey, eventStartYear, pageNumber, mask);
    assertPageIsFull(page, pageNumber, pageCount, config);
    items.push(...page.items);
  }
  assertAllItemsFetched(items, firstPage.totalCount);
  return { items, totalCount: firstPage.totalCount };
};

const trimText = (value) => (typeof value === "string" || isFiniteNumber(value) ? String(value).trim() : "");

const parseCompactDate = (value) => {
  const match = DATE_PATTERN.exec(trimText(value));
  if (match === null) return null;
  const [, year, month, day] = match.map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const isRealDate = date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
  return isRealDate ? date : null;
};

const formatIsoDate = (date) => formatDateParts({
  year: date.getUTCFullYear(),
  month: date.getUTCMonth() + 1,
  day: date.getUTCDate(),
});

const buildAddress = (item) => [trimText(item.addr1), trimText(item.addr2)].filter((part) => part !== "").join(" ");

const parseCoordinate = (value) => (trimText(value) === "" ? Number.NaN : Number(trimText(value)));

const isWithinBounds = (lat, lng, bounds) => Number.isFinite(lat) && Number.isFinite(lng)
  && lat >= bounds.minLat && lat <= bounds.maxLat
  && lng >= bounds.minLng && lng <= bounds.maxLng;

const findTopicIds = (title, topicKeywords) => Object.entries(topicKeywords)
  .filter(([, keywords]) => keywords.some((keyword) => title.includes(keyword)))
  .map(([topicId]) => topicId);

const classifyItem = (item, config) => {
  const id = trimText(item.contentid);
  const title = trimText(item.title);
  if (id === "" || title === "") return { reason: "missingIdOrTitle" };
  const start = parseCompactDate(item.eventstartdate);
  const end = parseCompactDate(item.eventenddate);
  if (start === null || end === null) return { reason: "invalidDate" };
  if (end < start) return { reason: "endBeforeStart" };
  if ((end - start) / MILLISECONDS_PER_DAY >= config.yearRoundMinimumDays) return { reason: "yearRound" };
  const lat = parseCoordinate(item.mapy);
  const lng = parseCoordinate(item.mapx);
  if (!isWithinBounds(lat, lng, config.koreaBounds)) return { reason: "invalidCoordinates" };
  const topicIds = findTopicIds(title, config.topicKeywords);
  if (topicIds.length === 0) return { reason: "noTopicMatch" };
  return {
    festival: {
      id,
      title,
      startDate: formatIsoDate(start),
      endDate: formatIsoDate(end),
      address: buildAddress(item),
      lat,
      lng,
      topicIds,
    },
  };
};

const compareFestivals = (first, second) => first.startDate.localeCompare(second.startDate) || first.id.localeCompare(second.id);

const buildFestivals = (items, config) => {
  const dropCounts = Object.fromEntries(Object.keys(DROP_REASONS).map((reason) => [reason, 0]));
  const festivalsById = new Map();
  for (const item of items) {
    const { festival, reason } = classifyItem(isPlainObject(item) ? item : {}, config);
    if (reason !== undefined) {
      dropCounts[reason] += 1;
    } else if (festivalsById.has(festival.id)) {
      dropCounts.duplicate += 1;
    } else {
      festivalsById.set(festival.id, festival);
    }
  }
  return { festivals: [...festivalsById.values()].sort(compareFestivals), dropCounts };
};

const buildOutput = (festivals, config, eventStartYear) => ({
  source: { name: config.source.name, url: config.source.url },
  updatedAt: formatSeoulToday(),
  eventStartDate: `${eventStartYear}-01-01`,
  festivals,
});

const printSummary = (fetchedCount, festivals, dropCounts, config, shouldWrite) => {
  console.log(`가져온 행사: ${fetchedCount}건, 남긴 행사: ${festivals.length}건`);
  console.log("주제별 건수:");
  for (const topicId of Object.keys(config.topicKeywords)) {
    const topicFestivals = festivals.filter((festival) => festival.topicIds.includes(topicId));
    console.log(`  ${topicId}: ${topicFestivals.length}건`);
    for (const festival of topicFestivals.slice(0, SAMPLE_TITLE_LIMIT)) {
      console.log(`    - ${festival.title} (${festival.startDate} ~ ${festival.endDate})`);
    }
  }
  console.log("제외한 행사:");
  for (const [reason, label] of Object.entries(DROP_REASONS)) {
    console.log(`  ${label}: ${dropCounts[reason]}건`);
  }
  if (!shouldWrite) {
    console.log(`드라이런이므로 파일을 쓰지 않았습니다. 반영하려면 ${WRITE_FLAG} 옵션으로 실행하세요.`);
  }
};

const readExistingOutput = async (outputPath) => {
  try {
    return await readJson(outputPath);
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
};

const countFestivals = (output) => (Array.isArray(output?.festivals) ? output.festivals.length : 0);

const assertNotEmptyingExistingOutput = (existing, output, outputFile) => {
  if (countFestivals(existing) > 0 && countFestivals(output) === 0) {
    throw new Error(`${outputFile}에 행사 ${countFestivals(existing)}건이 있는데 새 결과는 0건이라 덮어쓰지 않고 중단합니다. 키워드와 필터 설정을 확인하세요.`);
  }
};

const writeOutput = async (config, output) => {
  const outputPath = path.resolve(PROJECT_ROOT, config.outputFile);
  assertNotEmptyingExistingOutput(await readExistingOutput(outputPath), output, config.outputFile);
  const temporaryPath = `${outputPath}.tmp`;
  await writeFile(temporaryPath, `${JSON.stringify(output, null, 2)}\n`);
  await rename(temporaryPath, outputPath);
  console.log(`${config.outputFile} 파일을 저장했습니다.`);
};

const runBuild = async (config, authKey, options, mask) => {
  const eventStartYear = resolveEventStartYear(config);
  const { items } = await fetchAllItems(config, authKey, eventStartYear, mask);
  const { festivals, dropCounts } = buildFestivals(items, config);
  printSummary(items.length, festivals, dropCounts, config, options.shouldWrite);
  if (options.shouldWrite) {
    await writeOutput(config, buildOutput(festivals, config, eventStartYear));
  }
};

const main = async () => {
  const options = parseArguments(process.argv.slice(2));
  const config = await readJson(CONFIG_PATH);
  validateConfig(config);
  const authKey = readAuthKey(config);
  const mask = createMasker(authKey);
  try {
    await runBuild(config, authKey, options, mask);
  } catch (error) {
    throw new Error(mask(error.message));
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = EXIT_FAILURE;
});
