export const MAP_CONFIG = {
  center: [36.3, 127.8],
  zoom: 7,
  minZoom: 6,
  maxZoom: 14,
  tileUrl: "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
  tileAttribution: "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors | 관찰 데이터: <a href=\"https://www.gbif.org\">GBIF.org</a>",
};

export const TOPICS = [
  { id: "migratory-birds", dataFile: "data/migratory-birds.json" },
  { id: "cherry-blossom", dataFile: "data/cherry-blossom.json" },
  { id: "autumn-foliage", dataFile: "data/autumn-foliage.json" },
];

export const TOPIC_ENABLED_BY_DEFAULT = true;

export const MONTH_MIN = 1;
export const MONTH_MAX = 12;

export const getDefaultMonth = () => new Date().getMonth() + 1;
export const DEFAULT_MONTH = getDefaultMonth();

export const MARKER_STYLE = {
  radius: 11,
  weight: 2,
  borderColor: "#ffffff",
  fillOpacity: 0.85,
};

export const FALLBACK_MARKER_COLOR = "#888888";

export const MESSAGES = {
  loadFailed: "데이터를 불러오지 못했습니다.",
  mapLibraryFailed: "지도 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인해 주세요.",
  startFailed: "페이지를 시작하지 못했습니다.",
  tipsLabel: "관찰 팁",
  monthSuffix: "월",
};
