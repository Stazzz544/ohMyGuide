import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { Linking } from 'react-native';
import * as Location from 'expo-location';

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

// getCurrentPositionAsync не умеет таймаут и без сигнала GPS ждёт бесконечно
const waitForTimeout = (ms: number): Promise<never> =>
  new Promise((_, reject) => setTimeout(() => reject(new Error('POSITION_TIMEOUT')), ms));

const getPositionFx = createEffect(async (): Promise<GeoPoint> => {
  const recent = await Location.getLastKnownPositionAsync({ maxAge: LAST_KNOWN_MAX_AGE_MS });
  if (recent) {
    return toGeoPoint(recent);
  }
  try {
    const current = await Promise.race([
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
      waitForTimeout(POSITION_TIMEOUT_MS),
    ]);
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
  clock: getPositionFx.doneData,
  target: $position,
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
};
