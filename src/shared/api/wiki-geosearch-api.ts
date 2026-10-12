import { buildQuery, publicGet } from './public-client';

import type { GeoBounds, GeoPoint } from '@app/shared/lib';

const WIKI_API_URL = 'https://ru.wikipedia.org/w/api.php';
const GEOSEARCH_LIMIT = 50;
const THUMBNAIL_SIZE = 160;

export type WikiNearbyPage = {
  pageId: number;
  title: string;
  lat: number;
  lon: number;
  description: string;
  thumbnail: string | null;
};

type GeoSearchResponse = {
  query?: {
    geosearch?: Array<{ pageid: number; title: string; lat: number; lon: number }>;
  };
};

type PagesInfoResponse = {
  query?: {
    pages?: Record<string, { description?: string; thumbnail?: { source: string } }>;
  };
};

// Рамку больше ~400 км² GeoSearch не принимает (ошибка toobig) — тогда ответ без мест
const geoSearch = async (area: Record<string, string>): Promise<WikiNearbyPage[]> => {
  const search = buildQuery({
    action: 'query',
    list: 'geosearch',
    ...area,
    gslimit: String(GEOSEARCH_LIMIT),
    format: 'json',
  });
  const found = (await publicGet<GeoSearchResponse>({ url: `${WIKI_API_URL}?${search}` })).query?.geosearch ?? [];

  if (found.length === 0) {
    return [];
  }

  const info = buildQuery({
    action: 'query',
    pageids: found.map((page) => page.pageid).join('|'),
    prop: 'pageimages|description',
    piprop: 'thumbnail',
    pithumbsize: String(THUMBNAIL_SIZE),
    pilimit: String(GEOSEARCH_LIMIT),
    format: 'json',
  });
  const pages = (await publicGet<PagesInfoResponse>({ url: `${WIKI_API_URL}?${info}` })).query?.pages ?? {};

  return found.map((page) => ({
    pageId: page.pageid,
    title: page.title,
    lat: page.lat,
    lon: page.lon,
    description: pages[page.pageid]?.description ?? '',
    thumbnail: pages[page.pageid]?.thumbnail?.source ?? null,
  }));
};

export const fetchWikiNearbyApi = ({ lat, lon }: GeoPoint, radiusM: number): Promise<WikiNearbyPage[]> =>
  geoSearch({ gscoord: `${lat.toFixed(3)}|${lon.toFixed(3)}`, gsradius: String(radiusM) });

export const fetchWikiBoxApi = ([west, south, east, north]: GeoBounds): Promise<WikiNearbyPage[]> =>
  geoSearch({ gsbbox: `${north.toFixed(4)}|${west.toFixed(4)}|${south.toFixed(4)}|${east.toFixed(4)}` });
