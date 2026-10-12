import { TOUR_SYSTEM_PROMPT } from '@app/shared/config';
import { groqRequest } from './groq-client';

export type GenerateTourParams = {
  placeName: string;
  apiKey: string;
  model: string;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

// Reasoning-модели в формате raw (дефолт Groq для не-GPT-OSS) пишут рассуждения в <think> прямо в content
const THINK_BLOCK_PATTERN = /<think>[\s\S]*?<\/think>/g;

// Генерация экскурсии через Groq
export const generateTourApi = async ({
  placeName,
  apiKey,
  model,
}: GenerateTourParams): Promise<string> => {
  const data = await groqRequest<ChatCompletionResponse>({
    path: '/chat/completions',
    method: 'POST',
    apiKey,
    body: {
      model,
      messages: [
        { role: 'system', content: TOUR_SYSTEM_PROMPT },
        { role: 'user', content: `Создай экскурсию по месту: ${placeName}` },
      ],
    },
  });

  const text = (data.choices?.[0]?.message?.content ?? '').replace(THINK_BLOCK_PATTERN, '').trim();

  if (!text) {
    throw { message: 'AI вернул пустой ответ. Попробуйте ещё раз', code: 'EMPTY_RESPONSE' };
  }

  return text;
};
