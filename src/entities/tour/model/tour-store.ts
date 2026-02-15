import { createStore, createEvent, createEffect, sample } from 'effector';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@app/shared/lib';
import { STORAGE_KEYS } from '@app/shared/config';

import type { Tour, TourId, CachedTour } from './types';
import type { FolderId } from '@app/entities/folder';

// --- Effects (работа с AsyncStorage) ---

const loadToursFx = createEffect(async (): Promise<Tour[]> => {
  const tours = await storage.get<Tour[]>(STORAGE_KEYS.TOURS);
  if (!tours) {
    return [];
  }
  // Миграция: добавить folderId для старых туров
  return tours.map((tour) => ({
    ...tour,
    folderId: tour.folderId ?? null,
  }));
});

const saveToursFx = createEffect(async (tours: Tour[]): Promise<void> => {
  await storage.set(STORAGE_KEYS.TOURS, tours);
});

const loadCachedTourFx = createEffect(async (): Promise<CachedTour | null> => {
  return storage.get<CachedTour>(STORAGE_KEYS.LAST_TOUR_CACHE);
});

const saveCachedTourFx = createEffect(async (tour: CachedTour): Promise<void> => {
  await storage.set(STORAGE_KEYS.LAST_TOUR_CACHE, tour);
});

// --- Stores ---

const $tours = createStore<Tour[]>([]);
const $cachedTour = createStore<CachedTour | null>(null);
const $isLoading = createStore<boolean>(false);

// --- Events ---

const tourSaved = createEvent<{
  placeName: string;
  generatedText: string;
  folderId?: FolderId | null;
}>();
const tourDeleted = createEvent<TourId>();
const tourMovedToFolder = createEvent<{ tourId: TourId; folderId: FolderId | null }>();
const toursLoaded = createEvent();
const cachedTourUpdated = createEvent<CachedTour>();
const toursRefreshed = createEvent();

// --- Логика через sample ---

// Загрузка туров из хранилища
sample({
  clock: toursLoaded,
  target: loadToursFx,
});

sample({
  clock: loadToursFx.doneData,
  target: $tours,
});

// Сохранение нового тура
sample({
  clock: tourSaved,
  source: $tours,
  fn: (tours, { placeName, generatedText, folderId = null }) => [
    {
      id: uuidv4(),
      placeName,
      generatedText,
      createdAt: new Date().toISOString(),
      folderId,
    },
    ...tours,
  ],
  target: $tours,
});

// Удаление тура
sample({
  clock: tourDeleted,
  source: $tours,
  fn: (tours, id) => tours.filter((t) => t.id !== id),
  target: $tours,
});

// Перемещение тура в папку
sample({
  clock: tourMovedToFolder,
  source: $tours,
  fn: (tours, { tourId, folderId }) =>
    tours.map((t) => (t.id === tourId ? { ...t, folderId } : t)),
  target: $tours,
});

// Персист при изменении $tours
sample({
  clock: $tours,
  target: saveToursFx,
});

// Кеш последнего тура
sample({
  clock: cachedTourUpdated,
  target: [$cachedTour, saveCachedTourFx],
});

// Загрузка кеша при старте
sample({
  clock: toursLoaded,
  target: loadCachedTourFx,
});

sample({
  clock: loadCachedTourFx.doneData,
  target: $cachedTour,
});

// Pull-to-refresh
sample({
  clock: toursRefreshed,
  target: loadToursFx,
});

// Loading состояние
sample({
  clock: loadToursFx,
  fn: () => true,
  target: $isLoading,
});

sample({
  clock: [loadToursFx.done, loadToursFx.fail],
  fn: () => false,
  target: $isLoading,
});

export const tourStore = {
  $tours,
  $cachedTour,
  $isLoading,
  tourSaved,
  tourDeleted,
  tourMovedToFolder,
  toursLoaded,
  cachedTourUpdated,
  toursRefreshed,
};
