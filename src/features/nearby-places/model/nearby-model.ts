import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { debounce } from 'patronum';
import { fetchWikiNearbyApi, fetchWikidataSightsApi, getErrorMessage } from '@app/shared/api';
import {
  NEARBY_CACHE_TTL_MS,
  NEARBY_DEFAULT_RADIUS_M,
  NEARBY_RADIUS_M,
  NEARBY_RADIUS_OPTIONS_M,
  STORAGE_KEYS,
} from '@app/shared/config';
import { isInBounds, snapToGrid, storage } from '@app/shared/lib';
import { buildPlaces } from '@app/entities/place';
import { favoriteToPlace, favoritesStore } from '@app/entities/favorite';
import { citySearchModel } from './city-search-model';
import { freeSearchModel } from './free-search-model';

import type { WikiNearbyPage, WikidataSight } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';
import type { PlaceKind, PlaceKindFilter, PlaceSort } from '@app/entities/place';
import type { MapRegion } from './free-search-model';

// Центр запроса к Wikidata округляем до сетки ~2 км: соседи шлют одинаковый запрос
// и получают ответ из кэша WDQS, а у нас он ложится в кэш по ключу ячейки
const GRID_STEP = 0.02;
const MAX_CACHED_CELLS = 30;
const REGION_DEBOUNCE_MS = 700;

export type SearchMode = 'radius' | 'city' | 'free';

const SEARCH_MODES: SearchMode[] = ['radius', 'city', 'free'];

type CitySearchSource = {
  searchMode: SearchMode;
  position: GeoPoint | null;
};

type ReadyCitySearchSource = {
  searchMode: SearchMode;
  position: GeoPoint;
};

type FreeSearchSource = {
  searchMode: SearchMode;
  region: MapRegion | null;
};

type ReadyFreeSearchSource = {
  searchMode: SearchMode;
  region: MapRegion;
};

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

const loadSearchModeFx = createEffect(async (): Promise<SearchMode> => {
  const searchMode = await storage.get<SearchMode>(STORAGE_KEYS.NEARBY_SEARCH_MODE);
  return SEARCH_MODES.find((option) => option === searchMode) ?? 'radius';
});

const saveSearchModeFx = createEffect(async (searchMode: SearchMode): Promise<void> => {
  await storage.set(STORAGE_KEYS.NEARBY_SEARCH_MODE, searchMode);
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
const $searchMode = createStore<SearchMode>('radius');
const $region = createStore<MapRegion | null>(null);
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
const searchModeChanged = createEvent<SearchMode>();
const regionChanged = createEvent<MapRegion>();
const kindChanged = createEvent<PlaceKindFilter>();
const placeSelected = createEvent<string>();
const selectionCleared = createEvent();

// Расстояния считаем от текущей позиции, а не от точки поиска: при ходьбе новый поиск идёт раз в 300 м.
// Запрашиваем всегда максимальный радиус, а выбранный применяем фильтром — без новых запросов
const $places = combine(
  {
    position: $position,
    sights: $sights,
    nearest: $nearest,
    sort: $sort,
    radius: $radius,
    searchMode: $searchMode,
    city: citySearchModel.$city,
    citySights: citySearchModel.$sights,
    freeRegion: freeSearchModel.$region,
    freeSights: freeSearchModel.$sights,
    freePages: freeSearchModel.$pages,
  },
  ({ position, sights, nearest, sort, radius, searchMode, city, citySights, freeRegion, freeSights, freePages }) => {
    if (!position) {
      return [];
    }
    if (searchMode === 'city') {
      if (!city) {
        return [];
      }
      const cityIds = new Set(citySights.map((sight) => sight.id));
      return buildPlaces({
        origin: position,
        isInside: (place) => isInBounds(place, city.bounds),
        sights: [...citySights, ...sights.filter((sight) => !cityIds.has(sight.id))],
        nearest,
        sort,
      });
    }
    if (searchMode === 'free') {
      if (!freeRegion) {
        return [];
      }
      return buildPlaces({
        origin: position,
        isInside: (place) => isInBounds(place, freeRegion.bounds),
        sights: Object.values(freeSights),
        nearest: Object.values(freePages),
        sort,
      });
    }
    return buildPlaces({ origin: position, isInside: (place) => place.distanceM <= radius, sights, nearest, sort });
  },
);
// Избранное место может быть далеко от поиска (другой город) — тогда берём его сохранённый снимок
const $selectedPlace = combine(
  { places: $places, favorites: favoritesStore.$favorites, position: $position, selectedId: $selectedId },
  ({ places, favorites, position, selectedId }) => {
    if (selectedId === null) {
      return null;
    }
    const place = places.find((item) => item.id === selectedId);
    if (place) {
      return place;
    }
    const favorite = favorites.find((item) => item.id === selectedId);
    return favorite ? favoriteToPlace(favorite, position) : null;
  },
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
  clock: retried,
  source: $searchMode,
  filter: (searchMode) => searchMode === 'city',
  target: citySearchModel.retried,
});

sample({
  clock: retried,
  source: { searchMode: $searchMode, position: $position },
  filter: (state: CitySearchSource): state is ReadyCitySearchSource =>
    state.searchMode === 'city' && state.position !== null,
  fn: ({ position }: ReadyCitySearchSource) => position,
  target: citySearchModel.citySearchRequested,
});

sample({
  clock: retried,
  source: { searchMode: $searchMode, region: $region },
  filter: (state: FreeSearchSource): state is ReadyFreeSearchSource =>
    state.searchMode === 'free' && state.region !== null,
  fn: ({ region }: ReadyFreeSearchSource) => region,
  target: freeSearchModel.freeSearchRequested,
});

sample({
  clock: sortChanged,
  target: $sort,
});

sample({
  clock: radiusRestored,
  target: [loadRadiusFx, loadSearchModeFx],
});

sample({
  clock: loadRadiusFx.doneData,
  target: $radius,
});

sample({
  clock: loadSearchModeFx.doneData,
  target: $searchMode,
});

sample({
  clock: radiusChanged,
  target: [$radius, saveRadiusFx],
});

sample({
  clock: radiusChanged,
  fn: (): SearchMode => 'radius',
  target: searchModeChanged,
});

sample({
  clock: searchModeChanged,
  target: [$searchMode, saveSearchModeFx],
});

sample({
  clock: [$searchMode.updates, $position.updates],
  source: { searchMode: $searchMode, position: $position },
  filter: (state: CitySearchSource): state is ReadyCitySearchSource =>
    state.searchMode === 'city' && state.position !== null,
  fn: ({ position }: ReadyCitySearchSource) => position,
  target: citySearchModel.citySearchRequested,
});

sample({
  clock: regionChanged,
  target: $region,
});

sample({
  clock: debounce(regionChanged, REGION_DEBOUNCE_MS),
  source: $searchMode,
  filter: (searchMode) => searchMode === 'free',
  fn: (_, region) => region,
  target: freeSearchModel.freeSearchRequested,
});

// Карта при переключении режима не двигается, поэтому грузим то, что уже в кадре
sample({
  clock: $searchMode.updates,
  source: $region,
  filter: (region: MapRegion | null, searchMode: SearchMode): region is MapRegion =>
    searchMode === 'free' && region !== null,
  target: freeSearchModel.freeSearchRequested,
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
  $searchMode,
  $error,
  $sightsError,
  $isNearestLoading,
  $isSightsLoading,
  $city: citySearchModel.$city,
  $cityError: citySearchModel.$error,
  $isCityLoading: citySearchModel.$isLoading,
  $isFreeLoading: freeSearchModel.$isLoading,
  $isZoomTooFar: freeSearchModel.$isZoomTooFar,
  $hasFailedTiles: freeSearchModel.$hasFailedTiles,
  searchRequested,
  positionChanged,
  retried,
  sortChanged,
  radiusChanged,
  radiusRestored,
  searchModeChanged,
  regionChanged,
  kindChanged,
  placeSelected,
  selectionCleared,
};
