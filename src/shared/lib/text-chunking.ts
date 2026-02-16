/**
 * Утилита для разбивки длинного текста на части (чанки)
 * для безопасного воспроизведения через expo-speech
 */

/**
 * Разбивает текст на предложения с учетом:
 * - Точки, восклицательные и вопросительные знаки
 * - Аббревиатуры (т.е., т.д., и т.п., г., ул.)
 * - Числа с точками (1.5, 10.20)
 * - Инициалы (А.С. Пушкин)
 */
export const splitIntoSentences = (text: string): string[] => {
  // Удаляем лишние пробелы и переносы строк
  const cleanText = text.replace(/\s+/g, ' ').trim();

  // Регулярное выражение для разбивки на предложения
  // Ищем точку, восклицательный или вопросительный знак, за которым следует пробел и заглавная буква
  // Но не разбиваем по аббревиатурам и числам
  const sentenceRegex = /(?<!\b[тТ]\.[еЕ]|\b[тТ]\.[дД]|\b[иИ]\s[тТ]\.[пП]|\b[гГ]|\b[рР]|\b[улУЛ]|\d)([.!?])\s+(?=[А-ЯЁA-Z])/g;

  const sentences: string[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = sentenceRegex.exec(cleanText)) !== null) {
    const sentence = cleanText.substring(lastIndex, match.index + match[1].length).trim();
    if (sentence) {
      sentences.push(sentence);
    }
    lastIndex = match.index + match[1].length;
  }

  // Добавить остаток текста
  const lastSentence = cleanText.substring(lastIndex).trim();
  if (lastSentence) {
    sentences.push(lastSentence);
  }

  return sentences.filter((s) => s.length > 0);
};

/**
 * Структура текста с сохранением абзацев
 */
export type ParagraphStructure = {
  sentences: string[];
  startIndex: number;
  endIndex: number;
};

export type TextStructure = {
  paragraphs: ParagraphStructure[];
  allSentences: string[];
};

/**
 * Информация об одном слове в глобальном контексте
 */
export type WordInfo = {
  word: string;
  globalIndex: number;
  sentenceIndex: number;
  indexInSentence: number;
};

/**
 * Расширенная структура предложения с информацией о словах
 */
export type SentenceInfo = {
  text: string;
  words: WordInfo[];
  globalWordStart: number;
  globalWordEnd: number;
  wordCount: number;
};

/**
 * Расширенная структура абзаца с информацией о словах
 */
export type ParagraphStructureV2 = {
  sentences: SentenceInfo[];
  startIndex: number;
  endIndex: number;
  globalWordStart: number;
  globalWordEnd: number;
};

/**
 * Расширенная структура текста с пословной разбивкой
 */
export type TextStructureV2 = {
  paragraphs: ParagraphStructureV2[];
  allSentences: SentenceInfo[];
  allWords: WordInfo[];
  totalWordCount: number;
};

/**
 * Разбивает текст на структуру: абзацы → предложения
 * Сохраняет оригинальную структуру с переносами строк
 */
export const splitTextWithStructure = (text: string): TextStructure => {
  if (!text || text.trim().length === 0) {
    return { paragraphs: [], allSentences: [] };
  }

  const paragraphTexts = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const allSentences: string[] = [];
  const paragraphs: ParagraphStructure[] = paragraphTexts.map((paragraphText) => {
    const sentences = splitIntoSentences(paragraphText);
    const startIndex = allSentences.length;
    allSentences.push(...sentences);
    const endIndex = allSentences.length - 1;

    return { sentences, startIndex, endIndex };
  });

  return { paragraphs, allSentences };
};

/**
 * Разбивает предложение на слова (пунктуация остаётся приклеенной к слову)
 */
export const splitSentenceIntoWords = (sentence: string): string[] => {
  return sentence.split(/\s+/).filter((w) => w.length > 0);
};

/**
 * Разбивает текст на структуру: абзацы → предложения → слова
 * Сохраняет глобальные индексы слов для пословного трекинга
 */
export const splitTextWithWordStructure = (text: string): TextStructureV2 => {
  if (!text || text.trim().length === 0) {
    return { paragraphs: [], allSentences: [], allWords: [], totalWordCount: 0 };
  }

  const paragraphTexts = text.split(/\n\n+/).filter((p) => p.trim().length > 0);

  const allSentences: SentenceInfo[] = [];
  const allWords: WordInfo[] = [];
  let globalWordIndex = 0;
  let sentenceIndex = 0;

  const paragraphs: ParagraphStructureV2[] = paragraphTexts.map((paragraphText) => {
    const rawSentences = splitIntoSentences(paragraphText);
    const startSentenceIndex = sentenceIndex;
    const paragraphWordStart = globalWordIndex;

    const sentenceInfos: SentenceInfo[] = rawSentences.map((sentenceText) => {
      const rawWords = splitSentenceIntoWords(sentenceText);
      const sentenceWordStart = globalWordIndex;

      const words: WordInfo[] = rawWords.map((word, indexInSentence) => {
        const wordInfo: WordInfo = {
          word,
          globalIndex: globalWordIndex,
          sentenceIndex,
          indexInSentence,
        };
        allWords.push(wordInfo);
        globalWordIndex++;
        return wordInfo;
      });

      const info: SentenceInfo = {
        text: sentenceText,
        words,
        globalWordStart: sentenceWordStart,
        globalWordEnd: Math.max(sentenceWordStart, globalWordIndex - 1),
        wordCount: words.length,
      };

      allSentences.push(info);
      sentenceIndex++;
      return info;
    });

    return {
      sentences: sentenceInfos,
      startIndex: startSentenceIndex,
      endIndex: Math.max(startSentenceIndex, sentenceIndex - 1),
      globalWordStart: paragraphWordStart,
      globalWordEnd: Math.max(paragraphWordStart, globalWordIndex - 1),
    };
  });

  return {
    paragraphs,
    allSentences,
    allWords,
    totalWordCount: globalWordIndex,
  };
};

/**
 * Группирует предложения в чанки до достижения maxChunkSize
 */
const groupSentencesIntoChunks = (sentences: string[], maxChunkSize: number): string[] => {
  if (sentences.length === 0) {
    return [];
  }

  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    // Если одно предложение больше maxChunkSize - разбить его принудительно
    if (sentence.length > maxChunkSize) {
      // Сохранить текущий чанк если есть
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }

      // Разбить длинное предложение по словам
      const words = sentence.split(/\s+/);
      let longChunk = '';

      for (const word of words) {
        if (longChunk.length + word.length + 1 <= maxChunkSize) {
          longChunk += (longChunk ? ' ' : '') + word;
        } else {
          if (longChunk) {
            chunks.push(longChunk.trim());
          }
          longChunk = word;
        }
      }

      if (longChunk) {
        currentChunk = longChunk;
      }
      continue;
    }

    // Проверить, поместится ли предложение в текущий чанк
    if (currentChunk.length + sentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? ' ' : '') + sentence;
    } else {
      // Сохранить текущий чанк и начать новый
      if (currentChunk) {
        chunks.push(currentChunk.trim());
      }
      currentChunk = sentence;
    }
  }

  // Добавить последний чанк
  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
};

/**
 * Разбивает текст на чанки заданного максимального размера
 * @param text - исходный текст
 * @param maxChunkSize - максимальный размер чанка в символах
 * @returns массив текстовых чанков
 */
export const splitTextIntoChunks = (text: string, maxChunkSize: number): string[] => {
  if (!text || text.trim().length === 0) {
    return [];
  }

  if (text.length <= maxChunkSize) {
    return [text];
  }

  // 1. Разбить на предложения
  const sentences = splitIntoSentences(text);

  // 2. Группировать предложения в чанки
  const chunks = groupSentencesIntoChunks(sentences, maxChunkSize);

  return chunks;
};
