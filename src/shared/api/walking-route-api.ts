import { publicGet } from './public-client';

import type { GeoPoint } from '@app/shared/lib';

const OSRM_FOOT_URL = 'https://routing.openstreetmap.de/routed-foot/route/v1/foot';

export type WalkingRoute = {
  line: GeoJSON.LineString;
  distanceM: number;
  durationS: number;
};

type OsrmResponse = {
  routes?: Array<{ geometry: GeoJSON.LineString; distance: number; duration: number }>;
};

export const fetchWalkingRouteApi = async (from: GeoPoint, to: GeoPoint): Promise<WalkingRoute> => {
  const path = `${from.lon},${from.lat};${to.lon},${to.lat}`;
  const data = await publicGet<OsrmResponse>({
    url: `${OSRM_FOOT_URL}/${path}?overview=full&geometries=geojson`,
  });
  const route = data.routes?.[0];

  if (!route) {
    throw { message: 'Не удалось построить пешеходный маршрут', code: 'NO_ROUTE' };
  }

  return { line: route.geometry, distanceM: route.distance, durationS: route.duration };
};
