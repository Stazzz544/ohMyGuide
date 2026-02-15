import { createStore, createEvent, sample } from 'effector';
import { tourStore } from '@app/entities/tour';
import type { FolderId } from '@app/entities/folder';

type PendingTourData = {
  placeName: string;
  generatedText: string;
};

// Stores
const $folderPickerVisible = createStore<boolean>(false);
const $pendingTour = createStore<PendingTourData | null>(null);

// Events
const saveTourPressed = createEvent<{ placeName: string; generatedText: string }>();
const folderSelected = createEvent<FolderId | null>();
const folderPickerClosed = createEvent();

// Логика открытия модалки выбора папки
sample({
  clock: saveTourPressed,
  fn: () => true,
  target: $folderPickerVisible,
});

sample({
  clock: saveTourPressed,
  fn: (data) => data,
  target: $pendingTour,
});

// Логика сохранения тура с выбранной папкой
sample({
  clock: folderSelected,
  source: $pendingTour,
  filter: (pendingTour): pendingTour is PendingTourData => pendingTour !== null,
  fn: (pendingTour, folderId) => ({
    placeName: pendingTour.placeName,
    generatedText: pendingTour.generatedText,
    folderId,
  }),
  target: tourStore.tourSaved,
});

// Закрытие модалки после сохранения
sample({
  clock: folderSelected,
  fn: () => false,
  target: $folderPickerVisible,
});

sample({
  clock: folderSelected,
  fn: () => null,
  target: $pendingTour,
});

// Логика закрытия модалки без сохранения
sample({
  clock: folderPickerClosed,
  fn: () => false,
  target: $folderPickerVisible,
});

sample({
  clock: folderPickerClosed,
  fn: () => null,
  target: $pendingTour,
});

export const saveModel = {
  $folderPickerVisible,
  $pendingTour,
  saveTourPressed,
  folderSelected,
  folderPickerClosed,
};
