import { groqRequest } from './groq-client';

export type GroqModel = {
  id: string;
  ownedBy: string;
};

type GroqModelDto = {
  id?: string;
  owned_by?: string;
  active?: boolean;
  context_window?: number;
};

export const DEFAULT_GROQ_MODEL = 'openai/gpt-oss-120b';

const MIN_CONTEXT_WINDOW = 16384;
// API не сообщает тип модели — распознавание/синтез речи и модерацию отсекаем по id
const NON_CHAT_MODEL_PATTERN = /whisper|tts|orpheus|guard/i;

const isChatModel = (model: GroqModelDto): model is GroqModelDto & { id: string } =>
  typeof model.id === 'string' &&
  model.active !== false &&
  !NON_CHAT_MODEL_PATTERN.test(model.id) &&
  (model.context_window ?? MIN_CONTEXT_WINDOW) >= MIN_CONTEXT_WINDOW;

export const fetchGroqModelsApi = async (apiKey: string): Promise<GroqModel[]> => {
  const { data = [] } = await groqRequest<{ data?: GroqModelDto[] }>({
    path: '/models',
    method: 'GET',
    apiKey,
  });

  return data
    .filter(isChatModel)
    .map((model) => ({ id: model.id, ownedBy: model.owned_by ?? '' }))
    .sort((first, second) => first.id.localeCompare(second.id));
};

export const pickFallbackModel = (models: GroqModel[]): string =>
  models.find((model) => model.id === DEFAULT_GROQ_MODEL)?.id ?? models[0]?.id ?? DEFAULT_GROQ_MODEL;
