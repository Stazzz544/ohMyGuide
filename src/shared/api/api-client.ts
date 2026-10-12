import { API_TIMEOUT_MS } from '@app/shared/config';

// Типы ошибок API
export type ApiError = {
  message: string;
  status?: number;
  code?: string;
};

type RequestConfig = {
  baseUrl: string;
  path: string;
  method: 'GET' | 'POST';
  body?: Record<string, unknown>;
  apiKey: string;
  timeout?: number;
};

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    return String(error.message);
  }
  return 'Произошла неизвестная ошибка';
};

// Универсальный API-клиент с таймаутом и обработкой ошибок
export const apiClient = {
  async request<T>(config: RequestConfig): Promise<T> {
    const { baseUrl, path, method, body, apiKey, timeout = API_TIMEOUT_MS } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey.trim()}`,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let errorMessage = `Ошибка сервера: ${response.status}`;
        let errorCode: string | undefined;

        // Пытаемся извлечь сообщение и код из тела ошибки
        try {
          const parsed = JSON.parse(errorBody) as {
            error?: { message?: string; code?: string };
            message?: string;
          };
          errorMessage = parsed.error?.message ?? parsed.message ?? errorMessage;
          errorCode = parsed.error?.code;
        } catch {
          // Не удалось распарсить — используем дефолтное сообщение
        }

        throw {
          message: errorMessage,
          status: response.status,
          code: errorCode,
        } satisfies ApiError;
      }

      return (await response.json()) as T;
    } catch (error) {
      if (error && typeof error === 'object' && 'message' in error && 'status' in error) {
        throw error; // Уже ApiError
      }
      if (error instanceof DOMException && error.name === 'AbortError') {
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
  },
};
