// Конфигурации AI-провайдеров

export type AiProviderId = 'deepseek' | 'openai' | 'anthropic';

export type AiProviderConfig = {
  id: AiProviderId;
  name: string;
  baseUrl: string;
  defaultModel: string;
  // Формирование запроса и парсинг ответа — разные для каждого провайдера
  formatRequest: (params: {
    model: string;
    systemPrompt: string;
    userMessage: string;
  }) => { path: string; body: Record<string, unknown>; headers: Record<string, string> };
  parseResponse: (data: unknown) => string;
};

// Парсер для OpenAI-совместимого формата (DeepSeek, OpenAI)
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

// OpenAI-совместимый формат запроса (для DeepSeek и OpenAI)
const formatOpenAiRequest = (
  params: { model: string; systemPrompt: string; userMessage: string },
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

export const AI_PROVIDERS: Record<AiProviderId, AiProviderConfig> = {
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek',
    baseUrl: 'https://api.deepseek.com',
    defaultModel: 'deepseek-chat',
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (GPT)',
    baseUrl: 'https://api.openai.com',
    defaultModel: 'gpt-4o-mini',
    formatRequest: formatOpenAiRequest,
    parseResponse: parseOpenAiResponse,
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com',
    defaultModel: 'claude-sonnet-4-5-20250929',
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
        'x-api-key': '', // Будет заполнен в api-client
      },
    }),
    parseResponse: parseAnthropicResponse,
  },
};

export const DEFAULT_PROVIDER: AiProviderId = 'deepseek';

// Список провайдеров для отображения в настройках
export const PROVIDER_LIST: Array<{ id: AiProviderId; name: string }> = [
  { id: 'deepseek', name: 'DeepSeek' },
  { id: 'openai', name: 'OpenAI (GPT)' },
  { id: 'anthropic', name: 'Anthropic (Claude)' },
];
