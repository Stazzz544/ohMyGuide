import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { withTimeout } from '@app/shared/lib';

import type { GeoPoint } from '@app/shared/lib';

export type LocationPermission = 'unknown' | 'granted' | 'denied';

type PermissionResult = {
  granted: boolean;
  canAskAgain: boolean;
};

const requestPermissionFx = createEffect(async (): Promise<PermissionResult> => {
  const { granted, canAskAgain } = await Location.requestForegroundPermissionsAsync();
  return { granted, canAskAgain };
});

const POSITION_TIMEOUT_MS = 15_000;
const LAST_KNOWN_MAX_AGE_MS = 2 * 60_000;

const toGeoPoint = ({ coords }: Location.LocationObject): GeoPoint => ({
  lat: coords.latitude,
  lon: coords.longitude,
});

const getPositionFx = createEffect(async (): Promise<GeoPoint> => {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  if (recent) {
    return toGeoPoint(recent);
  }
  try {
    // getCurrentPositionAsync не умеет таймаут и без сигнала GPS ждёт бесконечно
    const current = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      POSITION_TIMEOUT_MS,
    );
    return toGeoPoint(current);
  } catch (error) {
    // В помещении GPS может не поймать спутники: старая точка лучше, чем пустой экран
    const stale = await Location.getLastKnownPositionAsync();
    if (stale) {
      return toGeoPoint(stale);
    }
    throw error;
  }
});

const openSettingsFx = createEffect(async (): Promise<void> => {
  await Linking.openSettings();
});

const TRACKING_DISTANCE_M = 10;

const positionWatched = createEvent<GeoPoint>();

// Подписка — нативный ресурс, в стор её не кладём
let watchSubscription: Location.LocationSubscription | null = null;

const startTrackingFx = createEffect(async (): Promise<void> => {
  watchSubscription?.remove();
  watchSubscription = await Location.watchPositionAsync(
    { accuracy: Location.Accuracy.High, distanceInterval: TRACKING_DISTANCE_M },
    (location) => positionWatched(toGeoPoint(location)),
  );
});

const stopTrackingFx = createEffect((): void => {
  watchSubscription?.remove();
  watchSubscription = null;
});

const $permission = createStore<LocationPermission>('unknown');
const $canAskAgain = createStore<boolean>(true);
const $position = createStore<GeoPoint | null>(null);
const $error = createStore<string | null>(null);
const $isLocating = combine(
  requestPermissionFx.pending,
  getPositionFx.pending,
  (isRequesting, isGetting) => isRequesting || isGetting,
);

const locationRequested = createEvent();
const settingsOpened = createEvent();
const trackingStarted = createEvent();
const trackingStopped = createEvent();

sample({
  clock: locationRequested,
  fn: () => null,
  target: $error,
});

sample({
  clock: locationRequested,
  target: requestPermissionFx,
});

sample({
  clock: requestPermissionFx.doneData,
  fn: ({ granted }): LocationPermission => (granted ? 'granted' : 'denied'),
  target: $permission,
});

sample({
  clock: requestPermissionFx.doneData,
  fn: ({ canAskAgain }) => canAskAgain,
  target: $canAskAgain,
});

sample({
  clock: requestPermissionFx.doneData,
  filter: ({ granted }) => granted,
  target: getPositionFx,
});

sample({
  clock: [getPositionFx.doneData, positionWatched],
  target: $position,
});

sample({
  clock: trackingStarted,
  source: $permission,
  filter: (permission) => permission === 'granted',
  target: startTrackingFx,
});

sample({
  clock: trackingStopped,
  target: stopTrackingFx,
});

sample({
  clock: [requestPermissionFx.fail, getPositionFx.fail],
  fn: () => 'Не удалось определить местоположение. Проверьте, что геолокация на телефоне включена',
  target: $error,
});

sample({
  clock: settingsOpened,
  target: openSettingsFx,
});

export const locationModel = {
  $permission,
  $canAskAgain,
  $position,
  $error,
  $isLocating,
  locationRequested,
  settingsOpened,
  trackingStarted,
  trackingStopped,
};
