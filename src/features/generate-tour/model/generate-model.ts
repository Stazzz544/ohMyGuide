import { createStore, createEvent, createEffect, sample, combine } from 'effector';
import {
  fetchGroqModelsApi,
  generateTourApi,
  getErrorMessage,
  isModelUnavailableError,
  pickFallbackModel,
} from '@app/shared/api';
import { tourStore } from '@app/entities/tour';
import { settingsModel } from '@app/features/ai-settings';

import type { CachedTour } from '@app/entities/tour';
import type { GenerateTourParams } from '@app/shared/api';

// --- Effects ---

// Модель отключили в Groq после загрузки списка — один раз повторяем на доступной
const generateTourFx = createEffect(
  async (params: GenerateTourParams): Promise<{ text: string; model: string }> => {
    try {
      return { text: await generateTourApi(params), model: params.model };
    } catch (error) {
      if (!isModelUnavailableError(error)) {
        throw error;
      }
      const models = await fetchGroqModelsApi(params.apiKey);
      const availableModels = models.filter((item) => item.id !== params.model);
      if (availableModels.length === 0) {
        throw error;
      }
      const model = pickFallbackModel(availableModels);
      return { text: await generateTourApi({ ...params, model }), model };
    }
  },
);

// --- Stores ---

const $placeName = createStore<string>('');
const $generatedText = createStore<string>('');
const $error = createStore<string | null>(null);
const $modelNotice = createStore<string | null>(null);
const $isPrepareMode = createStore<boolean>(false);
const $isGenerating = generateTourFx.pending;

// --- Events ---

const placeNameChanged = createEvent<string>();
const generatePressed = createEvent();
const prepareOfflinePressed = createEvent();
const resetGeneration = createEvent();
const tourLoaded = createEvent<{ placeName: string; generatedText: string }>();

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

// Сброс ошибки и уведомления о смене модели при начале новой генерации
sample({
  clock: generateTourFx,
  fn: () => null,
  target: [$error, $modelNotice],
});

// Загрузка тура из сохранённых
sample({
  clock: tourLoaded,
  fn: ({ placeName }) => placeName,
  target: $placeName,
});

sample({
  clock: tourLoaded,
  fn: ({ generatedText }) => generatedText,
  target: $generatedText,
});

sample({
  clock: tourLoaded,
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
    apiKey: settingsModel.$apiKey,
    model: settingsModel.$model,
  },
  filter: ({ placeName, apiKey }) => placeName.trim().length > 0 && apiKey.trim().length > 0,
  target: generateTourFx,
});

// Генерация по нажатию кнопки "Подготовить офлайн"
sample({
  clock: prepareOfflinePressed,
  source: {
    placeName: $placeName,
    apiKey: settingsModel.$apiKey,
    model: settingsModel.$model,
  },
  filter: ({ placeName, apiKey }) => placeName.trim().length > 0 && apiKey.trim().length > 0,
  target: generateTourFx,
});

// Успешная генерация — обновляем текст
sample({
  clock: generateTourFx.doneData,
  fn: ({ text }) => text,
  target: $generatedText,
});

// Кеширование последнего тура
sample({
  clock: generateTourFx.doneData,
  source: $placeName,
  fn: (placeName, { text }): CachedTour => ({
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
  fn: ({ placeName }, { text }) => ({ placeName, generatedText: text }),
  target: tourStore.tourSaved,
});

// Генерация прошла на запасной модели — запоминаем её и сообщаем пользователю
sample({
  clock: generateTourFx.done,
  filter: ({ params, result }) => params.model !== result.model,
  fn: ({ result }) => result.model,
  target: settingsModel.modelSelected,
});

sample({
  clock: generateTourFx.done,
  filter: ({ params, result }) => params.model !== result.model,
  fn: ({ params, result }) =>
    `Модель «${params.model}» недоступна в Groq — экскурсия создана на «${result.model}», она выбрана в настройках`,
  target: $modelNotice,
});

// Ошибка генерации
sample({
  clock: generateTourFx.failData,
  fn: getErrorMessage,
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
  target: [$error, $modelNotice],
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
  $modelNotice,
  $isGenerating,
  $canGenerate,
  $isPrepareMode,
  placeNameChanged,
  generatePressed,
  prepareOfflinePressed,
  resetGeneration,
  tourLoaded,
};
