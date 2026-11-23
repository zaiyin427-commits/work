import { MAP_CONFIG, MARKER_STYLE, FALLBACK_MARKER_COLOR } from "./config.js";

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
  });
  L.tileLayer(MAP_CONFIG.tileUrl, {
    attribution: MAP_CONFIG.tileAttribution,
    maxZoom: MAP_CONFIG.maxZoom,
  }).addTo(map);
  return map;
};

const getMarkerColor = (site, month, speciesTable) => {
  const [firstObservation] = getObservationsInMonth(site, month);
  return speciesTable[firstObservation.species]?.color ?? FALLBACK_MARKER_COLOR;
};

const createMarker = (site, month, speciesTable, onSiteClick) => {
  const color = getMarkerColor(site, month, speciesTable);
  const marker = L.circleMarker([site.lat, site.lng], {
    radius: MARKER_STYLE.radius,
    weight: MARKER_STYLE.weight,
    color: MARKER_STYLE.borderColor,
    fillColor: color,
    fillOpacity: MARKER_STYLE.fillOpacity,
  });
  marker.bindTooltip(document.createTextNode(site.name));
  marker.on("click", () => onSiteClick(site, month));
  return marker;
};

export const createSiteLayer = (map) => {
  const layer = L.layerGroup().addTo(map);

  const render = (sites, speciesTable, month, onSiteClick) => {
    layer.clearLayers();
    const visibleSites = getVisibleSites(sites, month);
    visibleSites.forEach((site) =>
      createMarker(site, month, speciesTable, onSiteClick).addTo(layer),
    );
    return visibleSites.length;
  };

  return { render };
};
