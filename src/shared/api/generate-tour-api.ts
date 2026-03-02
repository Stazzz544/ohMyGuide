import { apiClient } from './api-client';
import { AI_PROVIDERS, AiProviderId } from './providers';
import { TOUR_SYSTEM_PROMPT } from '@app/shared/config';

export type GenerateTourParams = {
  placeName: string;
  providerId: AiProviderId;
  apiKey: string;
};

// Генерация экскурсии через выбранный AI-провайдер
export const generateTourApi = async ({
  placeName,
  providerId,
  apiKey,
}: GenerateTourParams): Promise<string> => {
  const provider = AI_PROVIDERS[providerId];

  // Для провайдеров с OAuth (GigaChat) получаем access token из авторизационных данных
  const effectiveApiKey = provider.getAccessToken
    ? await provider.getAccessToken(apiKey)
    : apiKey;

  const { path, body, headers } = provider.formatRequest({
    model: provider.defaultModel,
    systemPrompt: TOUR_SYSTEM_PROMPT,
    userMessage: `Создай экскурсию по месту: ${placeName}`,
    credentials: apiKey, // Сырой ввод нужен провайдерам, которые парсят его сами (YandexGPT)
  });

  const data = await apiClient.request<unknown>({
    baseUrl: provider.baseUrl,
    path,
    method: 'POST',
    body,
    headers,
    apiKey: effectiveApiKey,
    authStyle: provider.authStyle,
  });

  const text = provider.parseResponse(data);

  if (!text.trim()) {
    throw { message: 'AI вернул пустой ответ. Попробуйте ещё раз', code: 'EMPTY_RESPONSE' };
  }

  return text;
};
