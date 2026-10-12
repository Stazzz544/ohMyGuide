import { createStore, createEvent, createEffect, sample } from 'effector';
import { debounce } from 'patronum';
import { storage } from '@app/shared/lib';
import { STORAGE_KEYS } from '@app/shared/config';
import {
  DEFAULT_GROQ_MODEL,
  fetchGroqModelsApi,
  getErrorMessage,
  pickFallbackModel,
} from '@app/shared/api';

import type { GroqModel } from '@app/shared/api';

const API_KEY_DEBOUNCE_MS = 800;

// --- Effects ---

const loadSettingsFx = createEffect(async (): Promise<{ apiKey: string; model: string }> => {
  const apiKey = await storage.get<string>(STORAGE_KEYS.AI_API_KEY);
  const model = await storage.get<string>(STORAGE_KEYS.AI_MODEL);
  return {
    apiKey: apiKey ?? '',
    model: model ?? DEFAULT_GROQ_MODEL,
  };
});

const saveApiKeyFx = createEffect(async (apiKey: string): Promise<void> => {
  await storage.set(STORAGE_KEYS.AI_API_KEY, apiKey);
});

const saveModelFx = createEffect(async (model: string): Promise<void> => {
  await storage.set(STORAGE_KEYS.AI_MODEL, model);
});

const fetchModelsFx = createEffect(fetchGroqModelsApi);

// --- Stores ---

const $apiKey = createStore<string>('');
const $model = createStore<string>(DEFAULT_GROQ_MODEL);
const $models = createStore<GroqModel[]>([]);
const $modelsError = createStore<string | null>(null);
const $isModelsLoading = fetchModelsFx.pending;
const $isConfigured = $apiKey.map((key) => key.trim().length > 0);

// --- Events ---

const settingsLoaded = createEvent();
const apiKeyChanged = createEvent<string>();
const modelSelected = createEvent<string>();
const modelsRequested = createEvent();
const apiKeySettled = debounce(apiKeyChanged, API_KEY_DEBOUNCE_MS);

// --- Логика ---

// Загрузка настроек
sample({
  clock: settingsLoaded,
  target: loadSettingsFx,
});

sample({
  clock: loadSettingsFx.doneData,
  fn: ({ apiKey }) => apiKey,
  target: $apiKey,
});

sample({
  clock: loadSettingsFx.doneData,
  fn: ({ model }) => model,
  target: $model,
});

// Смена API-ключа
sample({
  clock: apiKeyChanged,
  target: [$apiKey, saveApiKeyFx],
});

sample({
  clock: apiKeyChanged,
  fn: () => null,
  target: $modelsError,
});

sample({
  clock: apiKeyChanged,
  filter: (apiKey) => apiKey.trim().length === 0,
  fn: (): GroqModel[] => [],
  target: $models,
});

// Выбор модели
sample({
  clock: modelSelected,
  target: [$model, saveModelFx],
});

// Автозапрос списка моделей: при старте, после ввода ключа и по кнопке «Обновить»
sample({
  clock: loadSettingsFx.doneData,
  filter: ({ apiKey }) => apiKey.trim().length > 0,
  fn: ({ apiKey }) => apiKey,
  target: fetchModelsFx,
});

sample({
  clock: [apiKeySettled, modelsRequested],
  source: $apiKey,
  filter: (apiKey) => apiKey.trim().length > 0,
  target: fetchModelsFx,
});

// Ответ на устаревший ключ (пользователь успел его поменять) игнорируем
const modelsReceived = sample({
  clock: fetchModelsFx.done,
  source: $apiKey,
  filter: (apiKey, { params }) => params === apiKey,
  fn: (_, { result }) => result,
});

const modelsFailed = sample({
  clock: fetchModelsFx.fail,
  source: $apiKey,
  filter: (apiKey, { params }) => params === apiKey,
  fn: (_, { error }) => getErrorMessage(error),
});

sample({
  clock: modelsReceived,
  target: $models,
});

sample({
  clock: modelsReceived,
  fn: () => null,
  target: $modelsError,
});

// Сохранённой модели нет в списке (Groq её отключил) — переключаемся на доступную
sample({
  clock: modelsReceived,
  source: $model,
  filter: (model, models) => models.length > 0 && !models.some((item) => item.id === model),
  fn: (_, models) => pickFallbackModel(models),
  target: modelSelected,
});

sample({
  clock: modelsFailed,
  target: $modelsError,
});

sample({
  clock: modelsFailed,
  fn: (): GroqModel[] => [],
  target: $models,
});

export const settingsModel = {
  $apiKey,
  $model,
  $models,
  $modelsError,
  $isModelsLoading,
  $isConfigured,
  apiKeyChanged,
  modelSelected,
  modelsRequested,
  settingsLoaded,
};
