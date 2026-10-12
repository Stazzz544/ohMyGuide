import Constants from 'expo-constants';
import { API_TIMEOUT_MS } from '@app/shared/config';

import type { ApiError } from './api-client';

// Википедия, Wikidata и OSRM требуют User-Agent, по которому можно найти автора;
// картинки Wikimedia с User-Agent по умолчанию (okhttp) отдают 403
export const APP_USER_AGENT = `OhMyGuide/${Constants.expoConfig?.version ?? '1.0.0'} (+https://github.com/Stazzz544/ohMyGuide)`;

type PublicRequest = {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
};

export const buildQuery = (params: Record<string, string>): string =>
  Object.entries(params)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
    .join('&');

export const publicGet = async <T>({
  url,
  headers = {},
  timeout = API_TIMEOUT_MS,
}: PublicRequest): Promise<T> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      headers: { 'User-Agent': APP_USER_AGENT, Accept: 'application/json', ...headers },
      signal: controller.signal,
    });

    if (!response.ok) {
      throw {
        message: `Ошибка сервера: ${response.status}`,
        status: response.status,
      } satisfies ApiError;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error && typeof error === 'object' && 'status' in error) {
      throw error;
    }
    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        message: 'Превышено время ожидания ответа от сервера',
        code: 'TIMEOUT',
      } satisfies ApiError;
    }
    throw {
      message: 'Ошибка сети. Проверьте подключение к интернету',
      code: 'NETWORK_ERROR',
    } satisfies ApiError;
  } finally {
    clearTimeout(timeoutId);
  }
};
