import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { fetchCityAreaApi, fetchWikidataBoxSightsApi, getErrorMessage } from '@app/shared/api';
import { NEARBY_CACHE_TTL_MS, STORAGE_KEYS } from '@app/shared/config';
import { boundsAreaKm2, isInBounds, storage } from '@app/shared/lib';

import type { CityArea, WikidataSight } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';

const MAX_CACHED_CITIES = 5;
// WDQS обрывает запрос на 60 с, а Москва целиком считается около 50 с
const CITY_SIGHTS_TIMEOUT_MS = 70_000;

type CitySightsCache = Record<string, { savedAt: number; sights: WikidataSight[] }>;

type CitySights = {
  city: CityArea;
  sights: WikidataSight[];
};

type RetrySource = {
  city: CityArea | null;
  sights: WikidataSight[];
  isLoading: boolean;
};

type ReadyRetrySource = RetrySource & {
  city: CityArea;
};

// Время запроса растёт с площадью рамки, поэтому в больших городах берём только самые известные места
const minSitelinksForCity = (city: CityArea): number => {
  const areaKm2 = boundsAreaKm2(city.bounds);
  if (areaKm2 <= 600) {
    return 3;
  }
  if (areaKm2 <= 1500) {
    return 8;
  }
  return 15;
};

const isFresh = (savedAt: number): boolean => Date.now() - savedAt <= NEARBY_CACHE_TTL_MS;

const fetchCityAreaFx = createEffect(fetchCityAreaApi);

const loadCachedSightsFx = createEffect(async (city: CityArea): Promise<WikidataSight[] | null> => {
  const entry = (await storage.get<CitySightsCache>(STORAGE_KEYS.CITY_SIGHTS_CACHE))?.[city.osmId];
  if (!entry || !isFresh(entry.savedAt)) {
    return null;
  }
  return entry.sights;
});

const fetchSightsFx = createEffect((city: CityArea) =>
  fetchWikidataBoxSightsApi({
    bounds: city.bounds,
    minSitelinks: minSitelinksForCity(city),
    timeout: CITY_SIGHTS_TIMEOUT_MS,
  }),
);

const saveCachedSightsFx = createEffect(async ({ city, sights }: CitySights): Promise<void> => {
  const cache = (await storage.get<CitySightsCache>(STORAGE_KEYS.CITY_SIGHTS_CACHE)) ?? {};
  const kept = Object.entries(cache)
    .filter(([key, entry]) => key !== city.osmId && isFresh(entry.savedAt))
    .sort(([, a], [, b]) => b.savedAt - a.savedAt)
    .slice(0, MAX_CACHED_CITIES - 1);
  await storage.set(
    STORAGE_KEYS.CITY_SIGHTS_CACHE,
    Object.fromEntries([[city.osmId, { savedAt: Date.now(), sights }], ...kept]),
  );
});

const $city = createStore<CityArea | null>(null);
const $sights = createStore<WikidataSight[]>([]);
const $error = createStore<string | null>(null);
const $isLoading = combine(
  fetchCityAreaFx.pending,
  loadCachedSightsFx.pending,
  fetchSightsFx.pending,
  (isLocating, isReadingCache, isFetching) => isLocating || isReadingCache || isFetching,
);

const citySearchRequested = createEvent<GeoPoint>();
const retried = createEvent();

// Пока пользователь внутри рамки прежнего города, Nominatim не спрашиваем: он разрешает раз в секунду
sample({
  clock: citySearchRequested,
  source: { city: $city, isLocating: fetchCityAreaFx.pending },
  filter: ({ city, isLocating }, point) => !isLocating && (city === null || !isInBounds(point, city.bounds)),
  fn: (_, point) => point,
  target: fetchCityAreaFx,
});

sample({
  clock: [fetchCityAreaFx, fetchSightsFx],
  fn: () => null,
  target: $error,
});

sample({
  clock: fetchCityAreaFx.failData,
  fn: getErrorMessage,
  target: $error,
});

const cityChanged = sample({
  clock: fetchCityAreaFx.doneData,
  source: $city,
  filter: (city, next) => city?.osmId !== next.osmId,
  fn: (_, next) => next,
});

sample({
  clock: cityChanged,
  target: [$city, loadCachedSightsFx],
});

sample({
  clock: cityChanged,
  fn: (): WikidataSight[] => [],
  target: $sights,
});

sample({
  clock: loadCachedSightsFx.done,
  source: $city,
  filter: (city, { params, result }) => city?.osmId === params.osmId && result !== null,
  fn: (_, { result }) => result ?? [],
  target: $sights,
});

sample({
  clock: loadCachedSightsFx.done,
  source: $city,
  filter: (city, { params, result }) => city?.osmId === params.osmId && result === null,
  fn: (_, { params }) => params,
  target: fetchSightsFx,
});

const sightsReceived = sample({
  clock: fetchSightsFx.done,
  source: $city,
  filter: (city, { params }) => city?.osmId === params.osmId,
  fn: (_, { params, result }): CitySights => ({ city: params, sights: result }),
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
  source: $city,
  filter: (city, { params }) => city?.osmId === params.osmId,
  fn: (_, { error }) => getErrorMessage(error),
  target: $error,
});

sample({
  clock: retried,
  source: { city: $city, sights: $sights, isLoading: $isLoading },
  filter: (state: RetrySource): state is ReadyRetrySource =>
    state.city !== null && state.sights.length === 0 && !state.isLoading,
  fn: ({ city }: ReadyRetrySource) => city,
  target: fetchSightsFx,
});

export const citySearchModel = {
  $city,
  $sights,
  $error,
  $isLoading,
  citySearchRequested,
  retried,
};
