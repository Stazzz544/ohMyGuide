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
  headers?: Record<string, string>;
  apiKey: string;
  // bearer: Authorization: Bearer <key>
  // x-api-key: x-api-key: <key>
  // none: провайдер сам выставляет заголовки авторизации через formatRequest
  authStyle?: 'bearer' | 'x-api-key' | 'none';
  timeout?: number;
};

// Универсальный API-клиент с таймаутом и обработкой ошибок
export const apiClient = {
  async request<T>(config: RequestConfig): Promise<T> {
    const {
      baseUrl,
      path,
      method,
      body,
      headers = {},
      apiKey,
      authStyle = 'bearer',
      timeout = API_TIMEOUT_MS,
    } = config;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    // Формируем заголовки авторизации
    const authHeaders: Record<string, string> = {};
    if (authStyle === 'bearer') {
      authHeaders['Authorization'] = `Bearer ${apiKey}`;
    } else if (authStyle === 'x-api-key') {
      authHeaders['x-api-key'] = apiKey;
    }
    // authStyle === 'none': авторизация задаётся провайдером через headers в formatRequest

    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders,
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorBody = await response.text().catch(() => '');
        let errorMessage = `Ошибка сервера: ${response.status}`;

        // Пытаемся извлечь сообщение из тела ошибки
        try {
          const parsed = JSON.parse(errorBody) as { error?: { message?: string }; message?: string };
          errorMessage = parsed.error?.message ?? parsed.message ?? errorMessage;
        } catch {
          // Не удалось распарсить — используем дефолтное сообщение
        }

        throw {
          message: errorMessage,
          status: response.status,
          code: errorBody,
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
