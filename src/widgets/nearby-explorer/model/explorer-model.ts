import { createEffect, createEvent, createStore, sample } from 'effector';
import { fetchMapStyleApi } from '@app/shared/api';
import { MAP_STYLE_URL } from '@app/shared/config';
import { distanceM } from '@app/shared/lib';
import { locationModel } from '@app/features/user-location';
import { nearbyModel } from '@app/features/nearby-places';

import type { StyleSpecification } from '@maplibre/maplibre-react-native';
import type { GeoPoint } from '@app/shared/lib';
import type { ColorScheme } from '@app/shared/theme';

// Меньший сдвиг не стоит нового поиска: расстояния в списке и так пересчитываются от позиции
const RESEARCH_DISTANCE_M = 300;

type MapStyles = Partial<Record<ColorScheme, StyleSpecification | string>>;

const loadMapStyleFx = createEffect(fetchMapStyleApi);

const $mapStyles = createStore<MapStyles>({});

const explorerOpened = createEvent();
const refreshed = createEvent();
const mapStyleRequested = createEvent<ColorScheme>();

const positionUpdated = sample({
  clock: locationModel.$position.updates,
  filter: (position): position is GeoPoint => position !== null,
});

sample({
  clock: explorerOpened,
  source: locationModel.$position,
  filter: (position) => position === null,
  target: locationModel.locationRequested,
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

export const explorerModel = {
  $mapStyles,
  explorerOpened,
  refreshed,
  mapStyleRequested,
};
