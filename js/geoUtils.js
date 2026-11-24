import { EARTH_RADIUS_KILOMETERS } from "./config.js";

const toRadians = (degrees) => (degrees * Math.PI) / 180;

export const getDistanceKilometers = (from, to) => {
  const latitudeDelta = toRadians(to.lat - from.lat);
  const longitudeDelta = toRadians(to.lng - from.lng);
  const haversine =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(toRadians(from.lat)) *
      Math.cos(toRadians(to.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * EARTH_RADIUS_KILOMETERS * Math.asin(Math.sqrt(haversine));
};
