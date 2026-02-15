import { createStore, createEvent, createEffect, sample, combine } from 'effector';
import { generateTourApi } from '@app/shared/api';
import { tourStore } from '@app/entities/tour';
import { settingsModel } from '@app/features/ai-settings';

import type { CachedTour } from '@app/entities/tour';
import type { AiProviderId } from '@app/shared/api';

// --- Effects ---

const generateTourFx = createEffect(
  async (params: { placeName: string; providerId: AiProviderId; apiKey: string }): Promise<string> => {
    return generateTourApi(params);
  },
);

// --- Stores ---

const $placeName = createStore<string>('');
const $generatedText = createStore<string>('');
const $error = createStore<string | null>(null);
const $isPrepareMode = createStore<boolean>(false);
const $isGenerating = generateTourFx.pending;

// --- Events ---

const placeNameChanged = createEvent<string>();
const generatePressed = createEvent();
const prepareOfflinePressed = createEvent();
const resetGeneration = createEvent();

// Обновление имени места
sample({
  clock: placeNameChanged,
  target: $placeName,
});

// Сброс ошибки при изменении ввода
sample({
  clock: placeNameChanged,
  fn: () => null,
  target: $error,
});

// Устанавливаем флаг prepareMode
sample({
  clock: prepareOfflinePressed,
  fn: () => true,
  target: $isPrepareMode,
});

sample({
  clock: generatePressed,
  fn: () => false,
  target: $isPrepareMode,
});

// Генерация по нажатию кнопки "Генерировать"
sample({
  clock: generatePressed,
  source: {
    placeName: $placeName,
    providerId: settingsModel.$provider,
    apiKey: settingsModel.$apiKey,
  },
  filter: ({ placeName, apiKey }) => placeName.trim().length > 0 && apiKey.trim().length > 0,
  target: generateTourFx,
});

// Генерация по нажатию кнопки "Подготовить офлайн"
sample({
  clock: prepareOfflinePressed,
  source: {
    placeName: $placeName,
    providerId: settingsModel.$provider,
    apiKey: settingsModel.$apiKey,
  },
  filter: ({ placeName, apiKey }) => placeName.trim().length > 0 && apiKey.trim().length > 0,
  target: generateTourFx,
});

// Успешная генерация — обновляем текст
sample({
  clock: generateTourFx.doneData,
  target: $generatedText,
});

// Кеширование последнего тура
sample({
  clock: generateTourFx.doneData,
  source: $placeName,
  fn: (placeName, text): CachedTour => ({
    placeName,
    generatedText: text,
    cachedAt: new Date().toISOString(),
  }),
  target: tourStore.cachedTourUpdated,
});

// Автосохранение при prepareMode
sample({
  clock: generateTourFx.doneData,
  source: { placeName: $placeName, isPrepareMode: $isPrepareMode },
  filter: ({ isPrepareMode }) => isPrepareMode,
  fn: ({ placeName }, generatedText) => ({ placeName, generatedText }),
  target: tourStore.tourSaved,
});

// Ошибка генерации
sample({
  clock: generateTourFx.failData,
  fn: (error): string => {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      return (error as { message: string }).message;
    }
    return 'Произошла неизвестная ошибка';
  },
  target: $error,
});

// Сброс
sample({
  clock: resetGeneration,
  fn: () => '',
  target: [$generatedText, $placeName],
});

sample({
  clock: resetGeneration,
  fn: () => null,
  target: $error,
});

// Составной стор: можно ли генерировать
const $canGenerate = combine(
  $placeName,
  $isGenerating,
  settingsModel.$isConfigured,
  (name, loading, configured) => name.trim().length > 0 && !loading && configured,
);

export const generateModel = {
  $placeName,
  $generatedText,
  $error,
  $isGenerating,
  $canGenerate,
  $isPrepareMode,
  placeNameChanged,
  generatePressed,
  prepareOfflinePressed,
  resetGeneration,
};
