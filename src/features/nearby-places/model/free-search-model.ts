import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { fetchWikiBoxApi, fetchWikidataBoxSightsApi } from '@app/shared/api';
import { boundsAreaKm2, boundsCenter, circleBounds, distanceM } from '@app/shared/lib';

import type { WikiNearbyPage, WikidataSight } from '@app/shared/api';
import type { GeoBounds } from '@app/shared/lib';

// Мельче в кадр попадают десятки плиток — столько запросов Wikidata не выдержит. Вид «5 км» на телефоне — зум 10,3–10,8
export const FREE_SEARCH_MIN_ZOOM = 10;
// Плитка 0,1° — около 11×6 км: в центре Москвы WDQS отвечает за ~6 с
const TILE_STEP = 0.1;
const MAX_TILES_PER_REGION = 4;
const TILE_MIN_SITELINKS = 3;
const TILE_TIMEOUT_MS = 45_000;
const MAX_GEOSEARCH_AREA_KM2 = 380;
const GEOSEARCH_FALLBACK_RADIUS_M = 9000;

export type MapRegion = {
  bounds: GeoBounds;
  zoom: number;
};

type Tile = {
  key: string;
  bounds: GeoBounds;
};

type TilesResult = {
  failed: string[];
  sights: WikidataSight[];
};

const toTiles = (bounds: GeoBounds): Tile[] => {
  const [west, south, east, north] = bounds;
  const center = boundsCenter(bounds);
  const tiles: Tile[] = [];

  for (let row = Math.floor(south / TILE_STEP); row * TILE_STEP < north; row += 1) {
    for (let column = Math.floor(west / TILE_STEP); column * TILE_STEP < east; column += 1) {
      tiles.push({
        key: `${row}:${column}`,
        bounds: [column * TILE_STEP, row * TILE_STEP, (column + 1) * TILE_STEP, (row + 1) * TILE_STEP],
      });
    }
  }

  return tiles.sort((a, b) => distanceM(center, boundsCenter(a.bounds)) - distanceM(center, boundsCenter(b.bounds)));
};

const geoSearchBounds = (bounds: GeoBounds): GeoBounds =>
  boundsAreaKm2(bounds) <= MAX_GEOSEARCH_AREA_KM2
    ? bounds
    : circleBounds(boundsCenter(bounds), GEOSEARCH_FALLBACK_RADIUS_M);

const loadTilesFx = createEffect(async (tiles: Tile[]): Promise<TilesResult> => {
  const results = await Promise.allSettled(
    tiles.map((tile) =>
      fetchWikidataBoxSightsApi({ bounds: tile.bounds, minSitelinks: TILE_MIN_SITELINKS, timeout: TILE_TIMEOUT_MS }),
    ),
  );

  return {
    failed: tiles.filter((_, index) => results[index].status === 'rejected').map((tile) => tile.key),
    sights: results.flatMap((result) => (result.status === 'fulfilled' ? result.value : [])),
  };
});

const fetchPagesFx = createEffect((bounds: GeoBounds) => fetchWikiBoxApi(geoSearchBounds(bounds)));

const $region = createStore<MapRegion | null>(null);
// Места копятся по id: вернувшись к уже просмотренному району, пользователь видит их без новых запросов
const $sights = createStore<Record<string, WikidataSight>>({});
const $pages = createStore<Record<string, WikiNearbyPage>>({});
const $requestedTiles = createStore<string[]>([]);
const $hasFailedTiles = createStore<boolean>(false);
const $isZoomTooFar = $region.map((region) => region !== null && region.zoom < FREE_SEARCH_MIN_ZOOM);
const $isLoading = combine(
  loadTilesFx.pending,
  fetchPagesFx.pending,
  (isLoadingTiles, isLoadingPages) => isLoadingTiles || isLoadingPages,
);

const freeSearchRequested = createEvent<MapRegion>();

sample({
  clock: freeSearchRequested,
  target: $region,
});

const regionLoadable = sample({
  clock: freeSearchRequested,
  filter: (region) => region.zoom >= FREE_SEARCH_MIN_ZOOM,
});

const tilesQueued = sample({
  clock: regionLoadable,
  source: $requestedTiles,
  fn: (requested, region) =>
    toTiles(region.bounds)
      .filter((tile) => !requested.includes(tile.key))
      .slice(0, MAX_TILES_PER_REGION),
  filter: (requested, region) => toTiles(region.bounds).some((tile) => !requested.includes(tile.key)),
});

sample({
  clock: tilesQueued,
  source: $requestedTiles,
  fn: (requested, tiles) => [...requested, ...tiles.map((tile) => tile.key)],
  target: $requestedTiles,
});

sample({
  clock: tilesQueued,
  target: loadTilesFx,
});

// Упавшие плитки забываем, чтобы следующий сдвиг карты запросил их снова
sample({
  clock: loadTilesFx.doneData,
  source: $requestedTiles,
  filter: (_, { failed }) => failed.length > 0,
  fn: (requested, { failed }) => requested.filter((key) => !failed.includes(key)),
  target: $requestedTiles,
});

sample({
  clock: loadTilesFx.doneData,
  fn: ({ failed }) => failed.length > 0,
  target: $hasFailedTiles,
});

sample({
  clock: loadTilesFx.doneData,
  source: $sights,
  fn: (sights, { sights: received }) => ({
    ...sights,
    ...Object.fromEntries(received.map((sight) => [sight.id, sight])),
  }),
  target: $sights,
});

sample({
  clock: regionLoadable,
  fn: (region) => region.bounds,
  target: fetchPagesFx,
});

sample({
  clock: fetchPagesFx.doneData,
  source: $pages,
  fn: (pages, found) => ({ ...pages, ...Object.fromEntries(found.map((page) => [String(page.pageId), page])) }),
  target: $pages,
});

export const freeSearchModel = {
  $region,
  $sights,
  $pages,
  $isLoading,
  $isZoomTooFar,
  $hasFailedTiles,
  freeSearchRequested,
};
