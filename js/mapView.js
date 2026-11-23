import { MAP_CONFIG, MARKER_STYLE, MARKER_ICON, FALLBACK_MARKER_COLOR } from "./config.js";
import { getSpeciesIconSvg } from "./speciesIcons.js";

export const getObservationsInMonth = (site, month) =>
  site.observations.filter((observation) => observation.months.includes(month));

export const getVisibleSites = (sites, month) =>
  sites.filter((site) => getObservationsInMonth(site, month).length > 0);

export const createMap = (containerId) => {
  const map = L.map(containerId, {
    center: MAP_CONFIG.center,
    zoom: MAP_CONFIG.zoom,
    minZoom: MAP_CONFIG.minZoom,
    maxZoom: MAP_CONFIG.maxZoom,
    zoomControl: false,
  });
  L.control.zoom({ position: MAP_CONFIG.zoomControlPosition }).addTo(map);
  L.tileLayer(MAP_CONFIG.tileUrl, {
    attribution: MAP_CONFIG.tileAttribution,
    maxZoom: MAP_CONFIG.maxZoom,
  }).addTo(map);
  return map;
};

const warnedIconSpeciesIds = new Set();

const warnOnceAboutIcon = (speciesId, iconId) => {
  if (warnedIconSpeciesIds.has(speciesId)) {
    return;
  }
  warnedIconSpeciesIds.add(speciesId);
  const problem = iconId === undefined ? "icon 필드가 없습니다" : `알 수 없는 icon "${iconId}"입니다`;
  console.warn(`종 "${speciesId}": ${problem}. 원형 마커로 대체합니다.`);
};

const getFirstSpecies = (site, month, speciesTable) => {
  const [firstObservation] = getObservationsInMonth(site, month);
  return { id: firstObservation.species, data: speciesTable[firstObservation.species] };
};

const createCircleMarker = (site, color) =>
  L.circleMarker([site.lat, site.lng], {
    radius: MARKER_STYLE.radius,
    weight: MARKER_STYLE.weight,
    color: MARKER_STYLE.borderColor,
    fillColor: color,
    fillOpacity: MARKER_STYLE.fillOpacity,
  });

const createIconMarker = (site, species, svgMarkup) => {
  const wrapper = document.createElement("div");
  wrapper.className = `${MARKER_ICON.classPrefix}__icon`;
  wrapper.setAttribute("role", "img");
  wrapper.setAttribute("aria-label", `${site.name} – ${species.data.name}`);
  wrapper.innerHTML = svgMarkup;
  const icon = L.divIcon({
    className: `${MARKER_ICON.classPrefix} ${MARKER_ICON.classPrefix}--${species.data.icon}`,
    html: wrapper,
    iconSize: [MARKER_ICON.size, MARKER_ICON.size],
    iconAnchor: [MARKER_ICON.anchor, MARKER_ICON.anchor],
  });
  return L.marker([site.lat, site.lng], { icon, keyboard: true });
};

const createSiteMarker = (site, month, speciesTable) => {
  const species = getFirstSpecies(site, month, speciesTable);
  const color = species.data?.color ?? FALLBACK_MARKER_COLOR;
  const svgMarkup = getSpeciesIconSvg(species.data?.icon, color);
  if (svgMarkup === null) {
    warnOnceAboutIcon(species.id, species.data?.icon);
    return createCircleMarker(site, color);
  }
  return createIconMarker(site, species, svgMarkup);
};

const createMarker = (site, month, speciesTable, onSiteClick) => {
  const marker = createSiteMarker(site, month, speciesTable);
  marker.bindTooltip(document.createTextNode(site.name));
  const activate = () => onSiteClick(site, month);
  marker.on("click", activate);
  marker.on("keypress", (event) => {
    if (event.originalEvent.key === MARKER_ICON.activationKey) {
      activate();
    }
  });
  return marker;
};

export const createSiteLayer = (map) => {
  const layer = L.layerGroup().addTo(map);

  const renderTopic = (topicData, month, onSiteClick) => {
    const visibleSites = getVisibleSites(topicData.sites, month);
    visibleSites.forEach((site) =>
      createMarker(site, month, topicData.species, (clickedSite, clickedMonth) =>
        onSiteClick(clickedSite, clickedMonth, topicData),
      ).addTo(layer),
    );
    return visibleSites.length;
  };

  const render = (topicDataList, month, onSiteClick) => {
    layer.clearLayers();
    return topicDataList.reduce(
      (total, topicData) => total + renderTopic(topicData, month, onSiteClick),
      0,
    );
  };

  return { render };
};
