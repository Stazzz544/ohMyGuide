import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { Linking } from 'react-native';
import { fetchMapStyleApi, fetchWikiExtractApi } from '@app/shared/api';
import { MAP_STYLE_URL } from '@app/shared/config';
import { distanceM, reverseGeocode, withTimeout } from '@app/shared/lib';
import { locationModel } from '@app/features/user-location';
import { nearbyModel } from '@app/features/nearby-places';
import { routeModel } from '@app/features/walking-route';
import { generateModel } from '@app/features/generate-tour';

import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { PlaceContext } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';
import type { ColorScheme } from '@app/shared/theme';
import type { Place } from '@app/entities/place';

// Меньший сдвиг не стоит нового поиска: расстояния в списке и так пересчитываются от позиции
const RESEARCH_DISTANCE_M = 300;
const CONTEXT_TIMEOUT_MS = 3000;
const ARRIVAL_DISTANCE_M = 40;
const WIKI_ARTICLE_URL = 'https://ru.wikipedia.org/wiki/';

type MapStyles = Partial<Record<ColorScheme, StyleSpecification | string>>;

type RouteSource = {
  place: Place | null;
  position: GeoPoint | null;
};

type ReadyRouteSource = {
  place: Place;
  position: GeoPoint;
};

type PlaceTour = {
  placeName: string;
  context: PlaceContext;
};

const loadMapStyleFx = createEffect(fetchMapStyleApi);

// Адрес и справка необязательны: без них экскурсия всё равно сгенерируется по названию,
// поэтому долго их не ждём (геокодер Android без сети отвечает десятки секунд)
const collectPlaceContextFx = createEffect(async (place: Place): Promise<PlaceTour> => {
  const [address, extract] = await Promise.allSettled([
    withTimeout(reverseGeocode(place), CONTEXT_TIMEOUT_MS),
    withTimeout(fetchWikiExtractApi(place.title), CONTEXT_TIMEOUT_MS),
  ]);

  return {
    placeName: place.label,
    context: {
      lat: place.lat,
      lon: place.lon,
      address: address.status === 'fulfilled' ? address.value : undefined,
      extract: extract.status === 'fulfilled' ? extract.value : undefined,
    },
  };
});

const openArticleFx = createEffect(async (title: string): Promise<void> => {
  await Linking.openURL(`${WIKI_ARTICLE_URL}${encodeURIComponent(title.replace(/ /g, '_'))}`);
});

const $mapStyles = createStore<MapStyles>({});
const $isRefreshing = createStore<boolean>(false);
const $isPreparingTour = collectPlaceContextFx.pending;
// Точность GPS в городе 5–20 м, поэтому «на месте» считаем с запасом
const $isArrived = combine(
  locationModel.$position,
  nearbyModel.$selectedPlace,
  routeModel.$route,
  (position, place, route) =>
    position !== null && place !== null && route !== null && distanceM(position, place) <= ARRIVAL_DISTANCE_M,
);

const explorerOpened = createEvent();
const refreshed = createEvent();
const mapStyleRequested = createEvent<ColorScheme>();
const routeRequested = createEvent();
const tourRequested = createEvent();
const navigatorOpened = createEvent();
const articleOpened = createEvent();

const positionUpdated = sample({
  clock: locationModel.$position.updates,
  filter: (position): position is GeoPoint => position !== null,
});

sample({
  clock: explorerOpened,
  target: nearbyModel.radiusRestored,
});

sample({
  clock: explorerOpened,
  source: locationModel.$position,
  filter: (position) => position === null,
  target: locationModel.locationRequested,
});

sample({
  clock: positionUpdated,
  target: nearbyModel.positionChanged,
});

sample({
  clock: positionUpdated,
  source: nearbyModel.$origin,
  filter: (origin, position) => origin === null || distanceM(origin, position) > RESEARCH_DISTANCE_M,
  fn: (_, position) => position,
  target: nearbyModel.searchRequested,
});

sample({
  clock: refreshed,
  target: [locationModel.locationRequested, nearbyModel.retried],
});

// Индикатор только для ручного обновления: фоновый поиск при ходьбе не должен мигать в списке
sample({
  clock: refreshed,
  fn: () => true,
  target: $isRefreshing,
});

sample({
  clock: nearbyModel.$isNearestLoading.updates,
  filter: (isLoading) => !isLoading,
  fn: () => false,
  target: $isRefreshing,
});

sample({
  clock: mapStyleRequested,
  source: $mapStyles,
  filter: (styles, scheme) => styles[scheme] === undefined,
  fn: (_, scheme) => scheme,
  target: loadMapStyleFx,
});

sample({
  clock: loadMapStyleFx.done,
  source: $mapStyles,
  fn: (styles, { params, result }): MapStyles => ({ ...styles, [params]: result }),
  target: $mapStyles,
});

// Стиль не скачался — отдаём карте исходный URL: подписи будут латиницей, но карта откроется
sample({
  clock: loadMapStyleFx.fail,
  source: $mapStyles,
  fn: (styles, { params }): MapStyles => ({ ...styles, [params]: MAP_STYLE_URL[params] }),
  target: $mapStyles,
});

sample({
  clock: routeRequested,
  source: { place: nearbyModel.$selectedPlace, position: locationModel.$position },
  filter: (state: RouteSource): state is ReadyRouteSource => state.place !== null && state.position !== null,
  fn: ({ place, position }: ReadyRouteSource) => ({
    placeId: place.id,
    from: position,
    to: { lat: place.lat, lon: place.lon },
  }),
  target: routeModel.routeRequested,
});

sample({
  clock: nearbyModel.$selectedId.updates,
  target: routeModel.routeCleared,
});

// Ведём по GPS, только пока на карте есть маршрут: так меньше тратится батарея
sample({
  clock: routeModel.$route.updates,
  filter: (route) => route !== null,
  target: locationModel.trackingStarted,
});

sample({
  clock: routeModel.routeCleared,
  target: locationModel.trackingStopped,
});

sample({
  clock: navigatorOpened,
  source: nearbyModel.$selectedPlace,
  filter: (place): place is Place => place !== null,
  fn: (place: Place) => ({ point: { lat: place.lat, lon: place.lon }, label: place.label }),
  target: routeModel.navigatorOpened,
});

const placeTaken = sample({
  clock: tourRequested,
  source: nearbyModel.$selectedPlace,
  filter: (place): place is Place => place !== null,
});

sample({
  clock: placeTaken,
  fn: (place) => place.label,
  target: generateModel.placeTourStarted,
});

sample({
  clock: placeTaken,
  target: collectPlaceContextFx,
});

sample({
  clock: collectPlaceContextFx.doneData,
  target: generateModel.placeTourRequested,
});

sample({
  clock: articleOpened,
  source: nearbyModel.$selectedPlace,
  filter: (place): place is Place => place !== null,
  fn: (place: Place) => place.title,
  target: openArticleFx,
});

export const explorerModel = {
  $mapStyles,
  $isRefreshing,
  $isPreparingTour,
  $isArrived,
  explorerOpened,
  refreshed,
  mapStyleRequested,
  routeRequested,
  tourRequested,
  navigatorOpened,
  articleOpened,
};
