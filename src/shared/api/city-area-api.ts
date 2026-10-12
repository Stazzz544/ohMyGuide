import { buildQuery, publicGet } from './public-client';

import type { GeoBounds, GeoPoint } from '@app/shared/lib';
import type { ApiError } from './api-client';

const NOMINATIM_REVERSE_URL = 'https://nominatim.openstreetmap.org/reverse';
// Уровень 10 — граница города или городского округа, а не района и не улицы
const CITY_ZOOM = '10';

export type CityArea = {
  osmId: string;
  name: string;
  bounds: GeoBounds;
};

type NominatimReverseResponse = {
  osm_type?: string;
  osm_id?: number;
  name?: string;
  boundingbox?: [string, string, string, string];
  address?: { city?: string; town?: string; village?: string };
};

export const fetchCityAreaApi = async ({ lat, lon }: GeoPoint): Promise<CityArea> => {
  const query = buildQuery({
    format: 'jsonv2',
    lat: lat.toFixed(5),
    lon: lon.toFixed(5),
    zoom: CITY_ZOOM,
    'accept-language': 'ru',
  });
  const data = await publicGet<NominatimReverseResponse>({ url: `${NOMINATIM_REVERSE_URL}?${query}` });

  if (!data.boundingbox || data.osm_id === undefined) {
    throw { message: 'Не удалось определить границы города' } satisfies ApiError;
  }

  const [south, north, west, east] = data.boundingbox.map(Number);

  return {
    osmId: `${data.osm_type ?? 'place'}/${data.osm_id}`,
    name: data.address?.city ?? data.address?.town ?? data.address?.village ?? data.name ?? 'Город',
    bounds: [west, south, east, north],
  };
};
