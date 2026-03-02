// Конфигурации AI-провайдеров

export type AiProviderId = 'deepseek' | 'openai' | 'anthropic' | 'groq' | 'gigachat' | 'yandexgpt';

export type AiProviderConfig = {
  id: AiProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
  authStyle: 'bearer' | 'x-api-key' | 'none';
  // Подсказка для пользователя — что именно вводить в поле API-ключа
  apiKeyHint?: string;
  // Для провайдеров с OAuth (например, GigaChat) — обмен авторизационных данных на access token
  getAccessToken?: (credentials: string) => Promise<string>;
  // Формирование запроса и парсинг ответа — разные для каждого провайдера
  // credentials — сырой ввод пользователя (может содержать "apiKey:extraParam")
  formatRequest: (params: {
    model: string;
    systemPrompt: string;
    userMessage: string;
    credentials?: string;
  }) => { path: string; body: Record<string, unknown>; headers: Record<string, string> };
  parseResponse: (data: unknown) => string;
};

// Парсер для OpenAI-совместимого формата (DeepSeek, OpenAI, Groq, GigaChat)
const parseOpenAiResponse = (data: unknown): string => {
  const response = data as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return response.choices?.[0]?.message?.content ?? '';
};

// Парсер для Anthropic (Claude)
const parseAnthropicResponse = (data: unknown): string => {
  const response = data as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const textBlock = response.content?.find((block) => block.type === 'text');
  return textBlock?.text ?? '';
};

// Парсер для YandexGPT
const parseYandexGptResponse = (data: unknown): string => {
  const response = data as {
    result?: {
      alternatives?: Array<{
        message?: { text?: string };
        status?: string;
      }>;
    };
  };
  const alternatives = response.result?.alternatives ?? [];
  const final = alternatives.find((a) => a.status === 'ALTERNATIVE_STATUS_FINAL');
  return final?.message?.text ?? alternatives[0]?.message?.text ?? '';
};

// OpenAI-совместимый формат запроса (для DeepSeek, OpenAI, Groq, GigaChat)
const formatOpenAiRequest = (
  params: { model: string; systemPrompt: string; userMessage: string; credentials?: string },
): { path: string; body: Record<string, unknown>; headers: Record<string, string> } => ({
  path: '/v1/chat/completions',
  body: {
    model: params.model,
    messages: [
      { role: 'system', content: params.systemPrompt },
      { role: 'user', content: params.userMessage },
    ],
  },
  headers: {},
});

// Генерация UUID v4 для заголовка RqUID (GigaChat)
const generateUuid = (): string =>
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });

export const AI_PROVIDERS: Record<AiProviderId, AiProviderConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    authStyle: 'bearer',
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (GPT)',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    authStyle: 'bearer',
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5-20250929',
    authStyle: 'x-api-key',
    formatRequest: (params) => ({
      path: '/v1/messages',
      body: {
        model: params.model,
        max_tokens: 4096,
        system: params.systemPrompt,
        messages: [
          { role: 'user', content: params.userMessage },
        ],
      },
      headers: {
        'anthropic-version': '2023-06-01',
        // x-api-key проставляется автоматически через authStyle: 'x-api-key'
      },
    }),
    parseResponse: parseAnthropicResponse,
  },
  groq: {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai',
    defaultModel: 'llama-3.3-70b-versatile',
    authStyle: 'bearer',
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  gigachat: {
    id: 'gigachat',
    name: 'GigaChat (Сбер)',
    baseUrl: 'https://gigachat.devices.sberbank.ru/api/v1',
    defaultModel: 'GigaChat',
    authStyle: 'bearer',
    apiKeyHint: 'Вставьте «Авторизационные данные» из личного кабинета на developers.sber.ru/gigachat (кнопка «Получить Client Secret»)',
    getAccessToken: async (credentials: string): Promise<string> => {
      const response = await fetch('https://ngw.devices.sberbank.ru:9443/api/v2/oauth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json',
          'Authorization': `Basic ${credentials}`,
          'RqUID': generateUuid(),
        },
        body: 'scope=GIGACHAT_API_PERS',
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw {
          message: `Ошибка авторизации GigaChat (${response.status}). Проверьте авторизационные данные`,
          status: response.status,
          code: body,
        };
      }

      const data = (await response.json()) as { access_token: string };
      return data.access_token;
    },
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  yandexgpt: {
    id: 'yandexgpt',
    name: 'YandexGPT',
    baseUrl: 'https://llm.api.cloud.yandex.net',
    defaultModel: 'yandexgpt-lite',
    authStyle: 'none',
    apiKeyHint: 'Формат: api-ключ:id-каталога — оба значения из консоли console.yandex.cloud (IAM → Сервисные аккаунты)',
    formatRequest: (params) => {
      const [apiKey = '', folderId = ''] = (params.credentials ?? '').split(':');
      return {
        path: '/foundationModels/v1/completion',
        body: {
          modelUri: `gpt://${folderId}/yandexgpt-lite/latest`,
          completionOptions: {
            stream: false,
            temperature: 0.3,
            maxTokens: '4000',
          },
          messages: [
            { role: 'system', text: params.systemPrompt },
            { role: 'user', text: params.userMessage },
          ],
        },
        headers: {
          'Authorization': `Api-Key ${apiKey}`,
          'x-folder-id': folderId,
        },
      };
    },
    parseResponse: parseYandexGptResponse,
  },
};

export const DEFAULT_PROVIDER: AiProviderId = 'deepseek';

// Список провайдеров для отображения в настройках
export const PROVIDER_LIST: Array<{ id: AiProviderId; name: string }> = [
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'openai', name: 'OpenAI (GPT)' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
  { id: 'groq', name: 'Groq' },
  { id: 'gigachat', name: 'GigaChat (Сбер)' },
  { id: 'yandexgpt', name: 'YandexGPT' },
];
