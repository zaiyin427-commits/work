export const MAP_CONFIG = {
  center: [36.3, 127.8],
  zoom: 7,
  minZoom: 6,
  maxZoom: 14,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  zoomControlPosition: "bottomright",
  tileAttribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors | 계절 정보: 기상청",
};

export const TOPICS = [
  { id: "forsythia", dataFile: "data/forsythia.json" },
  { id: "azalea", dataFile: "data/azalea.json" },
  { id: "cherry-blossom", dataFile: "data/cherry-blossom.json" },
  { id: "autumn-foliage", dataFile: "data/autumn-foliage.json" },
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
  compactMediaQuery: "(max-width: 640px), (max-height: 700px)",
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
  festivalMarkerGlyph: "축",
  festivalStatusOngoing: "진행 중",
  festivalStatusUpcoming: "예정",
  festivalStatusRecentlyEnded: "최근 종료",
  festivalLabelSeparator: " – ",
  festivalStatusSeparator: " · ",
  festivalPeriodSeparator: " ~ ",
  festivalEndsInPrefix: "종료까지 ",
  festivalEndsToday: "오늘 종료",
  festivalEndingSoon: "종료 임박",
  festivalDDayPrefix: "D-",
  festivalEndedAgoSuffix: "일 전 종료",
  festivalSourceLine: "출처: 한국관광공사",
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

export const PLAYBACK = {
  intervalMilliseconds: 3000,
};

export const FESTIVAL_FILE = "data/festivals.json";

export const FESTIVAL = {
  showByDefault: true,
  upcomingWindowDays: 14,
  recentlyEndedWindowDays: 7,
  endingSoonDays: 2,
  zIndexOffset: 1000,
  markerSize: 28,
  markerAnchor: 14,
  popupGap: 12,
  classPrefix: "festival-marker",
};

export const FESTIVAL_STATUS = {
  ongoing: "ongoing",
  upcoming: "upcoming",
  recentlyEnded: "recentlyEnded",
};
