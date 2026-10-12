import { createEffect, createEvent, createStore, sample } from 'effector';
import { Linking } from 'react-native';
import { fetchWalkingRouteApi, getErrorMessage } from '@app/shared/api';

import type { WalkingRoute } from '@app/shared/api';
import type { GeoPoint } from '@app/shared/lib';

export type RouteRequest = {
  placeId: string;
  from: GeoPoint;
  to: GeoPoint;
};

export type PlaceRoute = WalkingRoute & {
  placeId: string;
};

export type NavigatorTarget = {
  point: GeoPoint;
  label: string;
};

const fetchRouteFx = createEffect(
  async ({ placeId, from, to }: RouteRequest): Promise<PlaceRoute> => ({
    ...(await fetchWalkingRouteApi(from, to)),
    placeId,
  }),
);

// geo: открывает выбор приложения: Google Карты, Яндекс, 2ГИС, OsmAnd
const openNavigatorFx = createEffect(async ({ point, label }: NavigatorTarget): Promise<void> => {
  await Linking.openURL(`geo:0,0?q=${point.lat},${point.lon}(${encodeURIComponent(label)})`);
});

const $route = createStore<PlaceRoute | null>(null);
const $requestedPlaceId = createStore<string | null>(null);
const $error = createStore<string | null>(null);
const $isLoading = fetchRouteFx.pending;

const routeRequested = createEvent<RouteRequest>();
const routeCleared = createEvent();
const navigatorOpened = createEvent<NavigatorTarget>();

sample({
  clock: routeRequested,
  fn: ({ placeId }) => placeId,
  target: $requestedPlaceId,
});

sample({
  clock: routeRequested,
  fn: () => null,
  target: [$route, $error],
});

sample({
  clock: routeRequested,
  target: fetchRouteFx,
});

// Ответ по месту, с которого пользователь уже ушёл, игнорируем
sample({
  clock: fetchRouteFx.done,
  source: $requestedPlaceId,
  filter: (placeId, { params }) => placeId === params.placeId,
  fn: (_, { result }) => result,
  target: $route,
});

sample({
  clock: fetchRouteFx.fail,
  source: $requestedPlaceId,
  filter: (placeId, { params }) => placeId === params.placeId,
  fn: (_, { error }) => getErrorMessage(error),
  target: $error,
});

sample({
  clock: routeCleared,
  fn: () => null,
  target: [$route, $requestedPlaceId, $error],
});

sample({
  clock: navigatorOpened,
  target: openNavigatorFx,
});

export const routeModel = {
  $route,
  $error,
  $isLoading,
  routeRequested,
  routeCleared,
  navigatorOpened,
};
