export const MAP_CONFIG = {
  center: [36.3, 127.8],
  zoom: 7,
  minZoom: 6,
  maxZoom: 14,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  zoomControlPosition: "bottomright",
  tileAttribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors | 관찰 데이터: <a href=\"https://www.gbif.org\">GBIF.org</a> | 계절 정보: 기상청 | 철새 추적: Movebank (CC BY-NC 4.0)",
};

export const MIGRATORY_BIRDS_TOPIC_ID = "migratory-birds";

export const TOPICS = [
  { id: MIGRATORY_BIRDS_TOPIC_ID, dataFile: "data/migratory-birds.json" },
  { id: "forsythia", dataFile: "data/forsythia.json" },
  { id: "azalea", dataFile: "data/azalea.json" },
  { id: "cherry-blossom", dataFile: "data/cherry-blossom.json" },
  { id: "autumn-foliage", dataFile: "data/autumn-foliage.json" },
];

export const REAL_TRACKS = [
  { dataFile: "data/tracks/white-naped-crane.json", topicId: MIGRATORY_BIRDS_TOPIC_ID },
];

export const MONTH_MIN = 1;
export const MONTH_MAX = 12;
export const MONTHS_PER_YEAR = 12;

export const getToday = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const CALENDAR = {
  weekdayLabels: ["일", "월", "화", "수", "목", "금", "토"],
  isoPartWidth: 2,
  monthsPerStep: 1,
  collapseKey: "Escape",
};

export const MARKER_STYLE = {
  radius: 11,
  weight: 2,
  borderColor: "#ffffff",
  fillOpacity: 0.85,
};

export const MARKER_ICON = {
  size: 30,
  anchor: 15,
  classPrefix: "species-marker",
  activationKey: "Enter",
};

export const SPECIES_ICON = {
  viewBoxSize: 32,
  outlineColor: "#ffffff",
  outlineWidth: 2,
  colorPattern: /^#[0-9a-fA-F]{3,8}$/,
};

export const FALLBACK_MARKER_COLOR = "#888888";

export const MESSAGES = {
  loadFailed: "데이터를 불러오지 못했습니다.",
  mapLibraryFailed: "지도 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.",
  startFailed: "페이지를 시작하지 못했습니다.",
  tipsLabel: "관찰 팁",
  monthSuffix: "월",
  playLabel: "▶ 재생",
  pauseLabel: "⏸ 정지",
  daySuffix: "일",
  seasonNormalLabel: "평년(1991–2020)",
  seasonObservedLabelSuffix: "년 관측",
  seasonDateBasisSuffix: " 기준",
  yearSuffix: "년",
  calendarCollapsedMarker: "▾",
  calendarExpandedMarker: "▴",
  seasonNormalBasis: "평년 기준",
  seasonObservedBasisSuffix: "년 관측 기준",
  seasonPartialObservedBasisSuffix: "년 관측·평년 기준",
  seasonStationLabel: "기준 관측소",
  seasonProxyNote: "대체 관측소",
  seasonEventSeparator: " · ",
  seasonBeforeSuffix: " 전",
  legendRealTrackPrefix: "실제 GPS 추적: ",
  legendRealTrackCount: "1마리",
  legendSeasonSeparator: "–",
  legendStayArea: "머문 지역 (실제 GPS, 0.1° 반올림 기준)",
  legendEstimated: "추정 경로 (번식지 대략값 기준)",
  legendSourcePrefix: "추적 자료: ",
  trackSpeciesMissing: "실제 추적의 종이 철새 데이터에 없어 대체 색을 사용합니다:",
  trackDoiInvalid: "추적 자료의 doi가 http(s) 주소로 바꿀 수 없습니다:",
  trackLicenseUrlInvalid: "추적 자료의 licenseUrl이 http(s) 주소가 아닙니다:",
  legendSourceSeparator: "·",
  legendModificationPrefix: "일별 중앙값·",
  legendModificationSuffix: "° 반올림으로 가공",
  trackDayLabelSeparator: " · ",
  trackDayPositionSuffix: " 위치",
  trackDayNoRecordSuffix: " 기록 없음",
  trackDayFallbackOpen: " (",
  trackDayFallbackClose: ")",
  legendGoToPosition: "위치로 이동",
  legendMultipleTracks: "실제 추적이 둘 이상 불러와졌지만 범례에는 첫 번째만 표시합니다.",
};

export const SEASON_OBSERVATIONS_FILE = "data/season-observations.json";

export const SEASON_VIEWING_WINDOW_DAYS = 7;

export const SEASON_LEAP_REFERENCE_YEAR = 2000;

export const SEASON_STATUS = {
  before: "before",
  inSeason: "inSeason",
  after: "after",
};

export const SEASON_STATUS_LABELS = {
  [SEASON_STATUS.inSeason]: "볼만한 시기",
  [SEASON_STATUS.after]: "지난 시기",
};

export const MIGRATION_ANIMATION = {
  paneName: "migrationPane",
  paneZIndex: 350,
  durationMilliseconds: 2000,
  dotCount: 5,
  dotRadius: 6,
  dotFillOpacity: 1,
  dotStrokeColor: "#ffffff",
  dotStrokeWeight: 2,
  pathOpacity: 0.7,
  startStaggerRatio: 0.4,
  curveBend: 0.25,
  pathPointCount: 40,
  pathWeight: 3,
  pathDashArray: "8 8",
};

export const PLAYBACK = {
  intervalMilliseconds: 3000,
};

export const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const LATITUDE_LIMIT = 90;

export const LONGITUDE_LIMIT = 180;

export const DOI_URL_PREFIX = "https://doi.org/";

export const DOI_BARE_PATTERN = /^10\./;

export const REAL_TRACK = {
  pathClassName: "real-track-path",
  dotClassName: "real-track-dot",
  pathWeight: 4,
  pathOpacity: 0.9,
  pathMinimumDistinctPoints: 2,
  dotRadius: 7,
  dotFillOpacity: 1,
  dotStrokeColor: "#ffffff",
  dotStrokeWeight: 2,
  dayPositionClassName: "real-track-day-position",
  dayPositionRadius: 9,
  dayPositionStrokeWeight: 3,
  dayLabelClassName: "real-track-day-label",
  goToPositionMinimumZoom: 7,
  stayAreaClassName: "real-track-stay-area",
  stayAreaMaxSpreadKilometers: 30,
  stayAreaMinimumRecords: 3,
  stayAreaMinSemiAxisKilometers: 5,
  roundingMarginCellFraction: 0.5,
  ellipseCircumscribeFactor: Math.SQRT2,
  stayAreaEllipseVertexCount: 64,
  stayAreaStrokeWeight: 2,
  stayAreaStrokeOpacity: 0.8,
  stayAreaFillOpacity: 0.25,
};

export const EARTH_RADIUS_KILOMETERS = 6371;

export const MAP_LEGEND = {
  topicId: MIGRATORY_BIRDS_TOPIC_ID,
  swatchColorProperty: "--legend-swatch-color",
};

export const HTTP_URL_PATTERN = /^https?:\/\//;
