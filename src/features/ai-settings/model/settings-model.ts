import { createStore, createEvent, createEffect, sample } from 'effector';
import { storage } from '@app/shared/lib';
import { STORAGE_KEYS } from '@app/shared/config';
import { DEFAULT_PROVIDER } from '@app/shared/api';
import type { AiProviderId } from '@app/shared/api';

// --- Effects ---

const loadSettingsFx = createEffect(async (): Promise<{
  provider: AiProviderId;
  apiKey: string;
}> => {
  const provider = await storage.get<AiProviderId>(STORAGE_KEYS.AI_PROVIDER);
  const apiKey = await storage.get<string>(STORAGE_KEYS.AI_API_KEY);
  return {
    provider: provider ?? DEFAULT_PROVIDER,
    apiKey: apiKey ?? '',
  };
});

const saveProviderFx = createEffect(async (provider: AiProviderId): Promise<void> => {
  await storage.set(STORAGE_KEYS.AI_PROVIDER, provider);
});

const saveApiKeyFx = createEffect(async (apiKey: string): Promise<void> => {
  await storage.set(STORAGE_KEYS.AI_API_KEY, apiKey);
});

// --- Stores ---

const $provider = createStore<AiProviderId>(DEFAULT_PROVIDER);
const $apiKey = createStore<string>('');
const $isConfigured = $apiKey.map((key) => key.trim().length > 0);

// --- Events ---

const providerChanged = createEvent<AiProviderId>();
const apiKeyChanged = createEvent<string>();
const settingsLoaded = createEvent();

// --- Логика ---

// Загрузка настроек
sample({
  clock: settingsLoaded,
  target: loadSettingsFx,
});

sample({
  clock: loadSettingsFx.doneData,
  fn: ({ provider }) => provider,
  target: $provider,
});

sample({
  clock: loadSettingsFx.doneData,
  fn: ({ apiKey }) => apiKey,
  target: $apiKey,
});

// Смена провайдера
sample({
  clock: providerChanged,
  target: [$provider, saveProviderFx],
});

// Смена API-ключа
sample({
  clock: apiKeyChanged,
  target: [$apiKey, saveApiKeyFx],
});

export const settingsModel = {
  $provider,
  $apiKey,
  $isConfigured,
  providerChanged,
  apiKeyChanged,
  settingsLoaded,
};
