import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { fetchWikiNearbyApi, fetchWikidataSightsApi, getErrorMessage } from '@app/shared/api';
import {
  NEARBY_CACHE_TTL_MS,
  NEARBY_DEFAULT_RADIUS_M,
  NEARBY_RADIUS_M,
  NEARBY_RADIUS_OPTIONS_M,
  STORAGE_KEYS,
} from '@app/shared/config';
import { snapToGrid, storage } from '@app/shared/lib';
import { buildPlaces } from '@app/entities/place';

import type { WikiNearbyPage, WikidataSight } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';
import type { PlaceKind, PlaceKindFilter, PlaceSort } from '@app/entities/place';

// Центр запроса к Wikidata округляем до сетки ~2 км: соседи шлют одинаковый запрос
// и получают ответ из кэша WDQS, а у нас он ложится в кэш по ключу ячейки
const GRID_STEP = 0.02;
const MAX_CACHED_CELLS = 30;

type Cell = {
  key: string;
  center: GeoPoint;
};

type SightsCache = Record<string, { savedAt: number; sights: WikidataSight[] }>;

type CachedSights = {
  cell: Cell;
  sights: WikidataSight[];
};

const toCell = (origin: GeoPoint): Cell => {
  const center = snapToGrid(origin, GRID_STEP);
  return { key: `${center.lat.toFixed(2)}:${center.lon.toFixed(2)}`, center };
};

const isFresh = (savedAt: number): boolean => Date.now() - savedAt <= NEARBY_CACHE_TTL_MS;

const loadCachedSightsFx = createEffect(async (cell: Cell): Promise<WikidataSight[] | null> => {
  const cache = await storage.get<SightsCache>(STORAGE_KEYS.NEARBY_SIGHTS_CACHE);
  const entry = cache?.[cell.key];
  if (!entry || !isFresh(entry.savedAt)) {
    return null;
  }
  return entry.sights;
});

const saveCachedSightsFx = createEffect(async ({ cell, sights }: CachedSights): Promise<void> => {
  const cache = (await storage.get<SightsCache>(STORAGE_KEYS.NEARBY_SIGHTS_CACHE)) ?? {};
  const kept = Object.entries(cache)
    .filter(([key, entry]) => key !== cell.key && isFresh(entry.savedAt))
    .sort(([, a], [, b]) => b.savedAt - a.savedAt)
    .slice(0, MAX_CACHED_CELLS - 1);
  await storage.set(
    STORAGE_KEYS.NEARBY_SIGHTS_CACHE,
    Object.fromEntries([[cell.key, { savedAt: Date.now(), sights }], ...kept]),
  );
});

const loadRadiusFx = createEffect(async (): Promise<number> => {
  const radius = await storage.get<number>(STORAGE_KEYS.NEARBY_RADIUS);
  return NEARBY_RADIUS_OPTIONS_M.find((option) => option === radius) ?? NEARBY_DEFAULT_RADIUS_M;
});

const saveRadiusFx = createEffect(async (radius: number): Promise<void> => {
  await storage.set(STORAGE_KEYS.NEARBY_RADIUS, radius);
});

const fetchSightsFx = createEffect((cell: Cell) => fetchWikidataSightsApi(cell.center));
const fetchNearestFx = createEffect((origin: GeoPoint) => fetchWikiNearbyApi(origin, NEARBY_RADIUS_M));

const $origin = createStore<GeoPoint | null>(null);
const $position = createStore<GeoPoint | null>(null);
const $cell = createStore<Cell | null>(null);
const $sights = createStore<WikidataSight[]>([]);
const $nearest = createStore<WikiNearbyPage[]>([]);
const $sort = createStore<PlaceSort>('distance');
const $radius = createStore<number>(NEARBY_DEFAULT_RADIUS_M);
const $kind = createStore<PlaceKindFilter>('all');
const $selectedId = createStore<string | null>(null);
const $error = createStore<string | null>(null);
const $sightsError = createStore<string | null>(null);
const $isNearestLoading = fetchNearestFx.pending;
const $isSightsLoading = combine(
  loadCachedSightsFx.pending,
  fetchSightsFx.pending,
  (isReadingCache, isFetching) => isReadingCache || isFetching,
);

const searchRequested = createEvent<GeoPoint>();
const positionChanged = createEvent<GeoPoint>();
const retried = createEvent();
const sortChanged = createEvent<PlaceSort>();
const radiusChanged = createEvent<number>();
const radiusRestored = createEvent();
const kindChanged = createEvent<PlaceKindFilter>();
const placeSelected = createEvent<string>();
const selectionCleared = createEvent();

// Расстояния считаем от текущей позиции, а не от точки поиска: при ходьбе новый поиск идёт раз в 300 м.
// Запрашиваем всегда максимальный радиус, а выбранный применяем фильтром — без новых запросов
const $places = combine(
  { position: $position, sights: $sights, nearest: $nearest, sort: $sort, radius: $radius },
  ({ position, sights, nearest, sort, radius }) =>
    position ? buildPlaces({ origin: position, radiusM: radius, sights, nearest, sort }) : [],
);
const $selectedPlace = combine(
  $places,
  $selectedId,
  (places, selectedId) => places.find((place) => place.id === selectedId) ?? null,
);
const $visiblePlaces = combine($places, $kind, (places, kind) =>
  kind === 'all' ? places : places.filter((place) => place.kind === kind),
);
const $kindCounts = $places.map((places) =>
  places.reduce<Partial<Record<PlaceKind, number>>>(
    (counts, place) => ({ ...counts, [place.kind]: (counts[place.kind] ?? 0) + 1 }),
    {},
  ),
);

sample({
  clock: searchRequested,
  target: [$origin, fetchNearestFx],
});

sample({
  clock: [searchRequested, positionChanged],
  target: $position,
});

// Выбор не сбрасываем: при ходьбе по маршруту поиск перезапускается каждые 300 м
sample({
  clock: searchRequested,
  fn: () => null,
  target: $error,
});

const cellChanged = sample({
  clock: searchRequested,
  source: $cell,
  filter: (cell, origin) => cell?.key !== toCell(origin).key,
  fn: (_, origin) => toCell(origin),
});

sample({
  clock: cellChanged,
  target: [$cell, loadCachedSightsFx],
});

sample({
  clock: cellChanged,
  fn: (): WikidataSight[] => [],
  target: $sights,
});

sample({
  clock: cellChanged,
  fn: () => null,
  target: $sightsError,
});

// Ответы по ячейке или точке, которые пользователь уже сменил, игнорируем
sample({
  clock: loadCachedSightsFx.done,
  source: $cell,
  filter: (cell, { params, result }) => cell?.key === params.key && result !== null,
  fn: (_, { result }) => result ?? [],
  target: $sights,
});

sample({
  clock: loadCachedSightsFx.done,
  source: $cell,
  filter: (cell, { params, result }) => cell?.key === params.key && result === null,
  fn: (_, { params }) => params,
  target: fetchSightsFx,
});

const sightsReceived = sample({
  clock: fetchSightsFx.done,
  source: $cell,
  filter: (cell, { params }) => cell?.key === params.key,
  fn: (_, { params, result }): CachedSights => ({ cell: params, sights: result }),
});

sample({
  clock: sightsReceived,
  fn: ({ sights }) => sights,
  target: $sights,
});

sample({
  clock: sightsReceived,
  filter: ({ sights }) => sights.length > 0,
  target: saveCachedSightsFx,
});

sample({
  clock: fetchSightsFx.fail,
  source: $cell,
  filter: (cell, { params }) => cell?.key === params.key,
  fn: (_, { error }) => getErrorMessage(error),
  target: $sightsError,
});

sample({
  clock: fetchNearestFx.done,
  source: $origin,
  filter: (origin, { params }) => origin === params,
  fn: (_, { result }) => result,
  target: $nearest,
});

sample({
  clock: fetchNearestFx.fail,
  source: $origin,
  filter: (origin, { params }) => origin === params,
  fn: (_, { error }) => getErrorMessage(error),
  target: $error,
});

sample({
  clock: retried,
  source: $origin,
  filter: Boolean,
  target: searchRequested,
});

sample({
  clock: retried,
  source: { cell: $cell, sights: $sights },
  filter: (state): state is CachedSights => state.cell !== null && state.sights.length === 0,
  fn: ({ cell }: CachedSights) => cell,
  target: fetchSightsFx,
});

sample({
  clock: retried,
  fn: () => null,
  target: $sightsError,
});

sample({
  clock: sortChanged,
  target: $sort,
});

sample({
  clock: radiusRestored,
  target: loadRadiusFx,
});

sample({
  clock: loadRadiusFx.doneData,
  target: $radius,
});

sample({
  clock: radiusChanged,
  target: [$radius, saveRadiusFx],
});

sample({
  clock: kindChanged,
  target: $kind,
});

sample({
  clock: kindChanged,
  fn: () => null,
  target: $selectedId,
});

// После нового поиска выбранной категории рядом может не оказаться
sample({
  clock: $kindCounts.updates,
  source: $kind,
  filter: (kind, counts) => kind !== 'all' && !counts[kind],
  fn: (): PlaceKindFilter => 'all',
  target: $kind,
});

sample({
  clock: placeSelected,
  source: $selectedId,
  fn: (selectedId, placeId) => (selectedId === placeId ? null : placeId),
  target: $selectedId,
});

sample({
  clock: selectionCleared,
  fn: () => null,
  target: $selectedId,
});

export const nearbyModel = {
  $origin,
  $places,
  $visiblePlaces,
  $kindCounts,
  $kind,
  $selectedId,
  $selectedPlace,
  $sort,
  $radius,
  $error,
  $sightsError,
  $isNearestLoading,
  $isSightsLoading,
  searchRequested,
  positionChanged,
  retried,
  sortChanged,
  radiusChanged,
  radiusRestored,
  kindChanged,
  placeSelected,
  selectionCleared,
};
