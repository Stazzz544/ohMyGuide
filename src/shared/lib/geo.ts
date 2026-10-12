export type GeoPoint = {
  lat: number;
  lon: number;
};

export type GeoBounds = [west: number, south: number, east: number, north: number];

const EARTH_RADIUS_M = 6371008.8;
const RAD = Math.PI / 180;
const WALK_SPEED_MPS = 1.25;
const WALK_DETOUR_FACTOR = 1.3;
const CIRCLE_STEPS = 96;

const destination = (center: GeoPoint, distance: number, bearing: number): GeoPoint => {
  const angular = distance / EARTH_RADIUS_M;
  const lat1 = center.lat * RAD;
  const lon1 = center.lon * RAD;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angular) + Math.cos(lat1) * Math.sin(angular) * Math.cos(bearing),
  );
  const lon2 =
    lon1 +
    Math.atan2(
      Math.sin(bearing) * Math.sin(angular) * Math.cos(lat1),
      Math.cos(angular) - Math.sin(lat1) * Math.sin(lat2),
    );
  return { lat: lat2 / RAD, lon: lon2 / RAD };
};

export const distanceM = (from: GeoPoint, to: GeoPoint): number => {
  const dLat = (to.lat - from.lat) * RAD;
  const dLon = (to.lon - from.lon) * RAD;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(from.lat * RAD) * Math.cos(to.lat * RAD) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(h));
};

export const circlePolygon = (center: GeoPoint, radiusM: number): GeoJSON.Feature<GeoJSON.Polygon> => {
  const ring = Array.from({ length: CIRCLE_STEPS + 1 }, (_, step) => {
    const point = destination(center, radiusM, (2 * Math.PI * step) / CIRCLE_STEPS);
    return [point.lon, point.lat];
  });
  return { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [ring] } };
};

export const circleBounds = (center: GeoPoint, radiusM: number): GeoBounds => {
  const north = destination(center, radiusM, 0);
  const east = destination(center, radiusM, Math.PI / 2);
  const south = destination(center, radiusM, Math.PI);
  const west = destination(center, radiusM, (3 * Math.PI) / 2);
  return [west.lon, south.lat, east.lon, north.lat];
};

export const snapToGrid = (point: GeoPoint, step: number): GeoPoint => ({
  lat: Number((Math.round(point.lat / step) * step).toFixed(4)),
  lon: Number((Math.round(point.lon / step) * step).toFixed(4)),
});

export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.max(10, Math.round(meters / 10) * 10)} м`;
  }
  return `${(meters / 1000).toFixed(1).replace('.', ',')} км`;
};

export const formatRadius = (meters: number): string =>
  meters < 1000 ? `${meters} м` : `${String(meters / 1000).replace('.', ',')} км`;

export const estimateWalkMinutes = (meters: number): number =>
  Math.max(1, Math.round((meters * WALK_DETOUR_FACTOR) / WALK_SPEED_MPS / 60));

export const formatDuration = (seconds: number): string => {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) {
    return `${minutes} мин`;
  }
  return `${Math.floor(minutes / 60)} ч ${minutes % 60} мин`;
};

export const lineBounds = (coordinates: GeoJSON.Position[]): GeoBounds =>
  coordinates.reduce<GeoBounds>(
    ([west, south, east, north], [lon, lat]) => [
      Math.min(west, lon),
      Math.min(south, lat),
      Math.max(east, lon),
      Math.max(north, lat),
    ],
    [Infinity, Infinity, -Infinity, -Infinity],
  );
