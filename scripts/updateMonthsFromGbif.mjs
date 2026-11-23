import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { isDeepStrictEqual } from "node:util";
import path from "node:path";

const PROJECT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(PROJECT_ROOT, "scripts", "gbif-config.json");
const WRITE_FLAG = "--write";
const HTTP_TOO_MANY_REQUESTS = 429;
const MONTH_FIRST = 1;
const MONTH_LAST = 12;
const EXIT_FAILURE = 1;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const readJson = async (filePath) => JSON.parse(await readFile(filePath, "utf8"));

const loadConfig = () => readJson(CONFIG_PATH);

const resolveDataPath = (config) => path.join(PROJECT_ROOT, config.dataFile);

const loadDataText = (config) => readFile(resolveDataPath(config), "utf8");

const collectReferencedSpeciesIds = (data) => {
  const speciesIds = new Set();
  for (const site of data.sites) {
    for (const observation of site.observations) {
      speciesIds.add(observation.species);
    }
  }
  return [...speciesIds];
};

const validateTaxonKeys = (data, config) => {
  const missingSpeciesIds = collectReferencedSpeciesIds(data).filter((speciesId) => {
    const taxonKeys = config.taxonKeys[speciesId];
    return !Array.isArray(taxonKeys) || taxonKeys.length === 0;
  });
  if (missingSpeciesIds.length > 0) {
    throw new Error(`gbif-config.json의 taxonKeys에 없는 종: ${missingSpeciesIds.join(", ")}`);
  }
};

const isNonEmptyString = (value) => typeof value === "string" && value.trim() !== "";
const isNonNegativeNumber = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;
const isNonNegativeInteger = (value) => Number.isInteger(value) && value >= 0;
const isPositiveInteger = (value) => Number.isInteger(value) && value > 0;
const isPositiveNumber = (value) => isNonNegativeNumber(value) && value > 0;
const isPlainObject = (value) => typeof value === "object" && value !== null && !Array.isArray(value);
const isYearRange = (value) => Array.isArray(value)
  && value.length === 2
  && value.every(Number.isInteger)
  && value[0] <= value[1];

const CONFIG_RULES = [
  ["dataFile", isNonEmptyString, "비어 있지 않은 문자열"],
  ["occurrenceSearchUrl", isNonEmptyString, "비어 있지 않은 문자열"],
  ["userAgent", isNonEmptyString, "비어 있지 않은 문자열"],
  ["radiusKilometers", isPositiveNumber, "0보다 큰 숫자"],
  ["minimumRecordsPerMonth", isPositiveInteger, "양의 정수"],
  ["requestIntervalMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["retryWaitMilliseconds", isNonNegativeNumber, "0 이상의 숫자"],
  ["maxRetries", isNonNegativeInteger, "0 이상의 정수"],
  ["yearRange", isYearRange, "from <= to 인 정수 두 개의 배열"],
  ["taxonKeys", isPlainObject, "객체"],
];

const validateConfig = (config) => {
  const problems = CONFIG_RULES
    .filter(([key, isValid]) => !isValid(config[key]))
    .map(([key, , expectation]) => `${key} (${expectation})`);
  if (problems.length > 0) {
    throw new Error(`gbif-config.json의 설정이 올바르지 않습니다: ${problems.join(", ")}`);
  }
};

const buildRequestUrl = (config, site, taxonKeys) => {
  const [yearFrom, yearTo] = config.yearRange;
  const parameters = [
    ...taxonKeys.map((taxonKey) => `taxonKey=${taxonKey}`),
    `geoDistance=${site.lat},${site.lng},${config.radiusKilometers}km`,
    `year=${yearFrom},${yearTo}`,
    "hasCoordinate=true",
    "hasGeospatialIssue=false",
    "occurrenceStatus=PRESENT",
    "limit=0",
    "facet=month",
    `facetLimit=${MONTH_LAST}`,
  ];
  return `${config.occurrenceSearchUrl}?${parameters.join("&")}`;
};

const fetchResponse = async (url, config) => {
  try {
    return await fetch(url, { headers: { "User-Agent": config.userAgent } });
  } catch (error) {
    throw new Error(`네트워크 오류: ${error.message} (${url})`);
  }
};

const fetchJsonWithRetry = async (url, config) => {
  for (let attempt = 0; attempt <= config.maxRetries; attempt += 1) {
    const response = await fetchResponse(url, config);
    if (response.ok) {
      return response.json();
    }
    const canRetry = response.status === HTTP_TOO_MANY_REQUESTS && attempt < config.maxRetries;
    if (!canRetry) {
      throw new Error(`GBIF 요청 실패: HTTP ${response.status} (${url})`);
    }
    console.warn(`HTTP 429: ${config.retryWaitMilliseconds}ms 후 재시도 (${attempt + 1}/${config.maxRetries})`);
    await sleep(config.retryWaitMilliseconds);
  }
};

const fetchMonthCounts = async (url, config) => {
  const body = await fetchJsonWithRetry(url, config);
  const monthFacet = (body.facets ?? []).find((facet) => facet.field === "MONTH");
  if (!monthFacet) {
    throw new Error(`GBIF 응답에 MONTH facet이 없습니다 (${url})`);
  }
  const counts = {};
  for (let month = MONTH_FIRST; month <= MONTH_LAST; month += 1) {
    counts[month] = 0;
  }
  for (const { name, count } of monthFacet.counts ?? []) {
    counts[Number(name)] = count;
  }
  return counts;
};

const selectMonths = (counts, minimumRecordsPerMonth) => {
  const months = [];
  for (let month = MONTH_FIRST; month <= MONTH_LAST; month += 1) {
    if (counts[month] >= minimumRecordsPerMonth) {
      months.push(month);
    }
  }
  return months;
};

const hasSameMonths = (first, second) => {
  const sortedFirst = [...first].sort((a, b) => a - b);
  const sortedSecond = [...second].sort((a, b) => a - b);
  return sortedFirst.length === sortedSecond.length
    && sortedFirst.every((month, index) => month === sortedSecond[index]);
};

const decideOutcome = (currentMonths, newMonths) => {
  if (newMonths.length === 0) return "keptBecauseEmpty";
  return hasSameMonths(currentMonths, newMonths) ? "unchanged" : "changed";
};

const collectObservationPairs = (data) => data.sites.flatMap(
  (site) => site.observations.map((observation) => ({ site, observation })),
);

const collectUpdates = async (pairs, config) => {
  const updates = [];
  for (const [index, { site, observation }] of pairs.entries()) {
    if (index > 0) {
      await sleep(config.requestIntervalMilliseconds);
    }
    const url = buildRequestUrl(config, site, config.taxonKeys[observation.species]);
    const counts = await fetchMonthCounts(url, config);
    const newMonths = selectMonths(counts, config.minimumRecordsPerMonth);
    const outcome = decideOutcome(observation.months, newMonths);
    updates.push({ site, observation, counts, newMonths, outcome });
  }
  return updates;
};

const OBSERVATION_LINE_PATTERN = /(\{ "species": ")([^"]*)(", "months": )\[[^\]]*\]( \})/g;

const formatMonths = (months) => `[${months.join(", ")}]`;

const monthsToKeep = ({ observation }) => observation.months;

const monthsToWrite = ({ observation, newMonths, outcome }) => (
  outcome === "changed" ? newMonths : observation.months
);

const replaceMonthsInText = (dataText, pairs, selectMonthsToWrite) => {
  let matchCount = 0;
  const replaced = dataText.replace(OBSERVATION_LINE_PATTERN, (line, opening, speciesId, middle, closing) => {
    const pair = pairs[matchCount];
    matchCount += 1;
    if (!pair) return line;
    if (speciesId !== pair.observation.species) {
      throw new Error(`데이터 파일의 ${matchCount}번째 observation 줄의 종(${speciesId})이 기대한 종(${pair.observation.species})과 다릅니다. 줄 형식을 확인하세요.`);
    }
    return `${opening}${speciesId}${middle}${formatMonths(selectMonthsToWrite(pair))}${closing}`;
  });
  if (matchCount !== pairs.length) {
    throw new Error(`데이터 파일에서 찾은 observation 줄 수(${matchCount})가 기대한 쌍 수(${pairs.length})와 다릅니다. 줄 형식을 확인하세요.`);
  }
  return replaced;
};

const buildExpectedData = (data, pairs, selectMonthsToWrite) => {
  const expected = structuredClone(data);
  const expectedObservations = expected.sites.flatMap((site) => site.observations);
  pairs.forEach((pair, index) => {
    expectedObservations[index].months = selectMonthsToWrite(pair);
  });
  return expected;
};

const buildVerifiedText = (dataText, data, pairs, selectMonthsToWrite) => {
  const replaced = replaceMonthsInText(dataText, pairs, selectMonthsToWrite);
  const expected = buildExpectedData(data, pairs, selectMonthsToWrite);
  if (!isDeepStrictEqual(JSON.parse(replaced), expected)) {
    throw new Error("월 교체 결과가 기대한 데이터와 다릅니다. 파일을 쓰지 않습니다.");
  }
  return replaced;
};

const verifyTextLayout = (dataText, data, pairs) => {
  const replaced = buildVerifiedText(dataText, data, pairs, monthsToKeep);
  if (replaced !== dataText) {
    throw new Error("observation 줄 형식이 예상과 달라 현재 월을 그대로 다시 써도 원본과 일치하지 않습니다.");
  }
};

const OUTCOME_LABELS = {
  changed: "변경",
  unchanged: "동일",
  keptBecauseEmpty: "유지(새 결과 없음)",
};

const formatCounts = (counts) => {
  const entries = [];
  for (let month = MONTH_FIRST; month <= MONTH_LAST; month += 1) {
    entries.push(`${month}월:${counts[month]}`);
  }
  return entries.join(" ");
};

const printPair = ({ site, observation, counts, newMonths, outcome }, speciesNames) => {
  console.log(`[${site.name}] ${speciesNames[observation.species]}`);
  console.log(`  현재 월: [${observation.months.join(", ")}]`);
  console.log(`  월별 기록 수: ${formatCounts(counts)}`);
  console.log(`  새 월: [${newMonths.join(", ")}]`);
  console.log(`  결과: ${OUTCOME_LABELS[outcome]}`);
  if (outcome === "keptBecauseEmpty") {
    console.warn(`  경고: 기준 이상인 월이 없어 기존 값을 유지합니다 (${site.name} / ${speciesNames[observation.species]})`);
  }
};

const printSummary = (updates, shouldWrite) => {
  const countOf = (outcome) => updates.filter((update) => update.outcome === outcome).length;
  console.log("");
  console.log(`요약: 변경 ${countOf("changed")}건 / 동일 ${countOf("unchanged")}건 / 새 결과 없어 유지 ${countOf("keptBecauseEmpty")}건`);
  if (!shouldWrite) {
    console.log(`드라이런이므로 파일을 쓰지 않았습니다. 반영하려면 --write 옵션으로 실행하세요.`);
  }
};

const printReport = (updates, data, shouldWrite) => {
  const speciesNames = Object.fromEntries(
    Object.entries(data.species).map(([speciesId, species]) => [speciesId, species.name]),
  );
  for (const update of updates) {
    printPair(update, speciesNames);
  }
  printSummary(updates, shouldWrite);
};

const writeIfChanged = async (config, dataText, data, updates) => {
  const newText = buildVerifiedText(dataText, data, updates, monthsToWrite);
  if (newText === dataText) {
    console.log("변경된 내용이 없어 파일을 쓰지 않았습니다.");
    return;
  }
  await writeFile(resolveDataPath(config), newText);
  console.log(`${config.dataFile} 파일을 저장했습니다.`);
};

const main = async () => {
  const shouldWrite = process.argv.includes(WRITE_FLAG);
  const config = await loadConfig();
  validateConfig(config);
  const dataText = await loadDataText(config);
  const data = JSON.parse(dataText);
  validateTaxonKeys(data, config);
  const pairs = collectObservationPairs(data);
  verifyTextLayout(dataText, data, pairs);
  const updates = await collectUpdates(pairs, config);
  printReport(updates, data, shouldWrite);
  if (shouldWrite) {
    await writeIfChanged(config, dataText, data, updates);
  }
};

main().catch((error) => {
  console.error(error.message);
  process.exitCode = EXIT_FAILURE;
});
