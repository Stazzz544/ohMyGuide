// Таймауты
export const API_TIMEOUT_MS = 60000;
export const DEBOUNCE_INPUT_MS = 300;

// TTS
export const DEFAULT_SPEECH_RATE = 1.0;
export const MIN_SPEECH_RATE = 0.5;
export const MAX_SPEECH_RATE = 2.0;
export const SPEECH_LANGUAGE = 'ru-RU';

// Хранилище
export const STORAGE_KEYS = {
  TOURS: 'ohmyguide_tours',
  LAST_TOUR_CACHE: 'ohmyguide_last_tour',
  THEME_OVERRIDE: 'ohmyguide_theme',
  AI_PROVIDER: 'ohmyguide_ai_provider',
  AI_API_KEY: 'ohmyguide_ai_api_key',
} as const;

// UI
export const BORDER_RADIUS = 12;
export const CARD_BORDER_RADIUS = 16;

// Системный промт для генерации экскурсий
export const TOUR_SYSTEM_PROMPT = `Ты — профессиональный экскурсовод.
Напиши интересную экскурсию на русском языке.
Структурировано, живо, увлекательно.
Без воды.`;
