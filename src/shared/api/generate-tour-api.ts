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

  const { path, body, headers } = provider.formatRequest({
    model: provider.defaultModel,
    systemPrompt: TOUR_SYSTEM_PROMPT,
    userMessage: `Создай экскурсию по месту: ${placeName}`,
  });

  const data = await apiClient.request<unknown>({
    baseUrl: provider.baseUrl,
    path,
    method: 'POST',
    body,
    headers,
    apiKey,
    authStyle: providerId === 'anthropic' ? 'x-api-key' : 'bearer',
  });

  const text = provider.parseResponse(data);

  if (!text.trim()) {
    throw { message: 'AI вернул пустой ответ. Попробуйте ещё раз', code: 'EMPTY_RESPONSE' };
  }

  return text;
};
