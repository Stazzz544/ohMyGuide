import { buildQuery, publicGet } from './public-client';

import type { GeoPoint } from '@app/shared/lib';

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

export const fetchWikiNearbyApi = async (
  { lat, lon }: GeoPoint,
  radiusM: number,
): Promise<WikiNearbyPage[]> => {
  const search = buildQuery({
    action: 'query',
    list: 'geosearch',
    gscoord: `${lat.toFixed(3)}|${lon.toFixed(3)}`,
    gsradius: String(radiusM),
    gslimit: String(GEOSEARCH_LIMIT),
    format: 'json',
  });
  const found = (await publicGet<GeoSearchResponse>({ url: `${WIKI_API_URL}?${search}` })).query
    ?.geosearch ?? [];

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
