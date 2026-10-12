import { apiClient } from './api-client';

import type { ApiError } from './api-client';

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

const MODEL_UNAVAILABLE_CODES = ['model_not_found', 'model_decommissioned'];

type GroqRequestConfig = {
  path: string;
  method: 'GET' | 'POST';
  apiKey: string;
  body?: Record<string, unknown>;
};

export const isModelUnavailableError = (error: unknown): boolean => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { status, code } = error as ApiError;
  return status === 404 || MODEL_UNAVAILABLE_CODES.includes(code ?? '');
};

const getGroqErrorMessage = (error: ApiError): string => {
  if (error.status === 401) {
    return 'Неверный API-ключ Groq. Проверьте ключ в настройках';
  }
  if (error.status === 429) {
    return 'Превышен лимит запросов Groq. Подождите минуту и попробуйте снова';
  }
  if (isModelUnavailableError(error)) {
    return 'Выбранная модель недоступна в Groq. Выберите другую в настройках';
  }
  return error.message;
};

export const groqRequest = async <T>(config: GroqRequestConfig): Promise<T> => {
  try {
    return await apiClient.request<T>({ baseUrl: GROQ_BASE_URL, ...config });
  } catch (error) {
    const apiError = error as ApiError;
    throw { ...apiError, message: getGroqErrorMessage(apiError) } satisfies ApiError;
  }
};
