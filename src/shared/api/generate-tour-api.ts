import { TOUR_SYSTEM_PROMPT } from '@app/shared/config';
import { groqRequest } from './groq-client';

export type PlaceContext = {
  lat: number;
  lon: number;
  address?: string;
  extract?: string;
};

export type GenerateTourParams = {
  placeName: string;
  apiKey: string;
  model: string;
  context?: PlaceContext | null;
};

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>;
};

// Reasoning-модели в формате raw (дефолт Groq для не-GPT-OSS) пишут рассуждения в <think> прямо в content
const THINK_BLOCK_PATTERN = /<think>[\s\S]*?<\/think>/g;

// Адрес и справка не дают модели спутать место с тёзкой и выдумать факты. Координаты не передаём:
// для узнавания места они бесполезны, а модель зачитывала их вслух вместе с адресом
const buildUserPrompt = (placeName: string, context?: PlaceContext | null): string => {
  if (!context || (!context.address && !context.extract)) {
    return `Создай экскурсию по месту: ${placeName}`;
  }

  return [
    `Создай экскурсию по месту: ${placeName}`,
    'Служебные данные ниже — только чтобы понять, о каком именно месте речь. Не зачитывай их, не называй адрес, улицу и номер дома.',
    context.address ? `Где это: ${context.address}` : '',
    context.extract ? `Справка из Википедии: ${context.extract}` : '',
    'Опирайся на справку и общеизвестные факты, но не пересказывай справку дословно. Если не уверен в факте, не упоминай его. Начни сразу с самого интересного факта о месте.',
  ]
    .filter(Boolean)
    .join('\n\n');
};

// Генерация экскурсии через Groq
export const generateTourApi = async ({ placeName, apiKey, model, context }: GenerateTourParams): Promise<string> => {
  const data = await groqRequest<ChatCompletionResponse>({
    path: '/chat/completions',
    method: 'POST',
    apiKey,
    body: {
      model,
      messages: [
        { role: 'system', content: TOUR_SYSTEM_PROMPT },
        { role: 'user', content: buildUserPrompt(placeName, context) },
      ],
    },
  });

  const text = (data.choices?.[0]?.message?.content ?? '').replace(THINK_BLOCK_PATTERN, '').trim();

  if (!text) {
    throw { message: 'AI вернул пустой ответ. Попробуйте ещё раз', code: 'EMPTY_RESPONSE' };
  }

  return text;
};
