import { createStore, createEvent, createEffect, sample } from 'effector';
import * as Speech from 'expo-speech';
import { speechService, splitTextWithWordStructure } from '@app/shared/lib';
import type { TextStructureV2 } from '@app/shared/lib';
import { DEFAULT_SPEECH_RATE, MIN_SPEECH_RATE, MAX_SPEECH_RATE, BASE_CHARS_PER_SECOND } from '@app/shared/config';

// --- Вспомогательная функция ---

const calcWordIntervalMs = (sentenceText: string, wordCount: number, speechRate: number): number => {
  if (wordCount <= 0) {
    return 500;
  }
  const charsPerSecond = BASE_CHARS_PER_SECOND * speechRate;
  const estimatedDurationMs = (sentenceText.length / charsPerSecond) * 1000;
  return estimatedDurationMs / wordCount;
};

// --- Events ---

const playPressed = createEvent<string>();
const stopPressed = createEvent();
const rateChanged = createEvent<number>();
const voiceSelected = createEvent<string>();
const seekToWord = createEvent<number>();
const wordTimerTicked = createEvent();
const sentenceStarted = createEvent();

// --- Effects ---

const speakSentenceFx = createEffect(
  ({ text, rate, voice }: { text: string; rate: number; voice?: string }): Promise<void> => {
    return new Promise((resolve, reject) => {
      speechService.speak({
        text,
        rate,
        voice,
        onStart: () => sentenceStarted(),
        onDone: resolve,
        onError: reject,
      });
    });
  },
);

const stopFx = createEffect((): void => {
  speechService.stop();
});

const seekAndSpeakFx = createEffect(
  ({ text, rate, voice }: { text: string; rate: number; voice?: string }): Promise<void> => {
    speechService.stop();
    return new Promise((resolve, reject) => {
      speechService.speak({
        text,
        rate,
        voice,
        onStart: () => sentenceStarted(),
        onDone: resolve,
        onError: reject,
      });
    });
  },
);

const loadVoicesFx = createEffect(async (): Promise<Speech.Voice[]> => {
  return speechService.getRussianVoices();
});

const startWordTimerFx = createEffect(
  ({ intervalMs, onTick }: { intervalMs: number; onTick: () => void }): ReturnType<typeof setInterval> => {
    return setInterval(onTick, intervalMs);
  },
);

const stopWordTimerFx = createEffect((timerId: ReturnType<typeof setInterval> | null): void => {
  if (timerId !== null) {
    clearInterval(timerId);
  }
});

// --- Stores ---

const $isSpeaking = createStore<boolean>(false);
const $speechRate = createStore<number>(DEFAULT_SPEECH_RATE);
const $sentences = createStore<string[]>([]);
const $currentSentenceIndex = createStore<number>(0);
const $currentWordIndex = createStore<number>(0);
const $selectedVoice = createStore<string | null>(null);
const $availableVoices = createStore<Speech.Voice[]>([]);
const $progress = createStore<number>(0);
const $textStructure = createStore<TextStructureV2 | null>(null);
const $wordTimerId = createStore<ReturnType<typeof setInterval> | null>(null);

// --- Логика ---

// Остановить текущую озвучку перед новой
sample({
  clock: playPressed,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  target: stopFx,
});

// Остановить таймер слов перед новым воспроизведением
sample({
  clock: playPressed,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

// 1. Разбить текст на структуру с пословной разбивкой
sample({
  clock: playPressed,
  fn: (text) => splitTextWithWordStructure(text),
  target: $textStructure,
});

// 1.1. Извлечь плоский массив строк предложений для TTS
sample({
  clock: $textStructure,
  fn: (structure) => structure?.allSentences.map((s) => s.text) ?? [],
  target: $sentences,
});

// 2. Сбросить индексы на 0
sample({
  clock: playPressed,
  fn: () => 0,
  target: [$currentSentenceIndex, $currentWordIndex],
});

// 3. Запустить воспроизведение первого предложения
sample({
  clock: $sentences,
  source: { sentences: $sentences, rate: $speechRate, voice: $selectedVoice },
  filter: ({ sentences }) => sentences.length > 0,
  fn: ({ sentences, rate, voice }) => ({
    text: sentences[0],
    rate,
    voice: voice ?? undefined,
  }),
  target: speakSentenceFx,
});

// 4. Запустить таймер ТОЛЬКО когда TTS реально начал говорить (onStart)
sample({
  clock: sentenceStarted,
  source: {
    structure: $textStructure,
    sentenceIndex: $currentSentenceIndex,
    rate: $speechRate,
    timerId: $wordTimerId,
  },
  filter: ({ structure }) => structure !== null,
  fn: ({ structure, sentenceIndex, rate }) => {
    const sentence = structure!.allSentences[sentenceIndex];
    const intervalMs = calcWordIntervalMs(sentence.text, sentence.wordCount, rate);
    return {
      intervalMs,
      onTick: () => wordTimerTicked(),
    };
  },
  target: startWordTimerFx,
});

// 4.0. Остановить старый таймер перед запуском нового
sample({
  clock: sentenceStarted,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

// 4.1. Сохранить timerId
sample({
  clock: startWordTimerFx.doneData,
  target: $wordTimerId,
});

// 5. При тике таймера — увеличить $currentWordIndex (не дальше конца предложения)
sample({
  clock: wordTimerTicked,
  source: {
    currentWordIndex: $currentWordIndex,
    structure: $textStructure,
    sentenceIndex: $currentSentenceIndex,
  },
  filter: ({ structure, sentenceIndex, currentWordIndex }) => {
    if (!structure) {
      return false;
    }
    const sentence = structure.allSentences[sentenceIndex];
    if (!sentence) {
      return false;
    }
    return currentWordIndex < sentence.globalWordEnd;
  },
  fn: ({ currentWordIndex }) => currentWordIndex + 1,
  target: $currentWordIndex,
});

// 6. При завершении предложения — остановить таймер
sample({
  clock: speakSentenceFx.done,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

// 6.1. Коррекция дрейфа: зафиксировать $currentWordIndex на конце предложения
sample({
  clock: speakSentenceFx.done,
  source: {
    structure: $textStructure,
    sentenceIndex: $currentSentenceIndex,
  },
  filter: ({ structure }) => structure !== null,
  fn: ({ structure, sentenceIndex }) => {
    const sentence = structure!.allSentences[sentenceIndex];
    return (sentence?.globalWordEnd ?? 0) + 1;
  },
  target: $currentWordIndex,
});

// 7. При завершении предложения — воспроизвести следующее
sample({
  clock: speakSentenceFx.done,
  source: {
    sentences: $sentences,
    index: $currentSentenceIndex,
    rate: $speechRate,
    voice: $selectedVoice,
  },
  filter: ({ sentences, index }) => index + 1 < sentences.length,
  fn: ({ sentences, index, rate, voice }) => ({
    text: sentences[index + 1],
    rate,
    voice: voice ?? undefined,
  }),
  target: speakSentenceFx,
});

// 7.1. Обновить индекс предложения
sample({
  clock: speakSentenceFx.done,
  source: $currentSentenceIndex,
  fn: (index) => index + 1,
  target: $currentSentenceIndex,
});

// 8. Остановка
sample({
  clock: stopPressed,
  target: stopFx,
});

// 8.1. Остановить таймер при остановке
sample({
  clock: stopPressed,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

// 8.2. Сбросить состояние при остановке
sample({
  clock: stopPressed,
  fn: () => null,
  target: [$textStructure, $wordTimerId],
});

sample({
  clock: stopPressed,
  fn: () => 0,
  target: [$currentSentenceIndex, $currentWordIndex],
});

// 9. Состояние "говорит"
sample({
  clock: speakSentenceFx,
  fn: () => true,
  target: $isSpeaking,
});

sample({
  clock: [speakSentenceFx.done, speakSentenceFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length,
  fn: () => false,
  target: $isSpeaking,
});

sample({
  clock: stopFx.done,
  fn: () => false,
  target: $isSpeaking,
});

// 10. Сбросить прогресс при завершении всех предложений
sample({
  clock: [speakSentenceFx.done, speakSentenceFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length,
  fn: () => 0,
  target: [$progress, $currentWordIndex],
});

// Остановить таймер при завершении всех предложений
sample({
  clock: [speakSentenceFx.done, speakSentenceFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex, timerId: $wordTimerId },
  filter: ({ sentences, index, timerId }) => index + 1 >= sentences.length && timerId !== null,
  fn: ({ timerId }) => timerId,
  target: stopWordTimerFx,
});

sample({
  clock: stopFx.done,
  fn: () => 0,
  target: $progress,
});

// 11. Скорость речи
sample({
  clock: rateChanged,
  filter: (rate) => rate >= MIN_SPEECH_RATE && rate <= MAX_SPEECH_RATE,
  target: $speechRate,
});

// 12. Загрузка голосов
sample({
  clock: loadVoicesFx.doneData,
  target: $availableVoices,
});

// 13. Выбор голоса
sample({
  clock: voiceSelected,
  target: $selectedVoice,
});

// 14. Seek к слову
sample({
  clock: seekToWord,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

sample({
  clock: seekToWord,
  target: $currentWordIndex,
});

sample({
  clock: seekToWord,
  source: $textStructure,
  filter: (structure, wordIndex) => {
    if (!structure) {
      return false;
    }
    return wordIndex >= 0 && wordIndex < structure.totalWordCount;
  },
  fn: (structure, wordIndex) => {
    const wordInfo = structure!.allWords[wordIndex];
    return wordInfo.sentenceIndex;
  },
  target: $currentSentenceIndex,
});

sample({
  clock: seekToWord,
  source: {
    structure: $textStructure,
    sentences: $sentences,
    rate: $speechRate,
    voice: $selectedVoice,
  },
  filter: ({ structure }, wordIndex) => {
    if (!structure) {
      return false;
    }
    return wordIndex >= 0 && wordIndex < structure.totalWordCount;
  },
  fn: ({ structure, sentences, rate, voice }, wordIndex) => {
    const wordInfo = structure!.allWords[wordIndex];
    return {
      text: sentences[wordInfo.sentenceIndex],
      rate,
      voice: voice ?? undefined,
    };
  },
  target: seekAndSpeakFx,
});

// 14.2. После seek — продолжить обычный поток
sample({
  clock: seekAndSpeakFx.done,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

sample({
  clock: seekAndSpeakFx.done,
  source: {
    structure: $textStructure,
    sentenceIndex: $currentSentenceIndex,
  },
  filter: ({ structure }) => structure !== null,
  fn: ({ structure, sentenceIndex }) => {
    const sentence = structure!.allSentences[sentenceIndex];
    return (sentence?.globalWordEnd ?? 0) + 1;
  },
  target: $currentWordIndex,
});

sample({
  clock: seekAndSpeakFx.done,
  source: {
    sentences: $sentences,
    index: $currentSentenceIndex,
    rate: $speechRate,
    voice: $selectedVoice,
  },
  filter: ({ sentences, index }) => index + 1 < sentences.length,
  fn: ({ sentences, index, rate, voice }) => ({
    text: sentences[index + 1],
    rate,
    voice: voice ?? undefined,
  }),
  target: speakSentenceFx,
});

sample({
  clock: seekAndSpeakFx.done,
  source: $currentSentenceIndex,
  fn: (index) => index + 1,
  target: $currentSentenceIndex,
});

// 14.3. Состояние isSpeaking для seek
sample({
  clock: seekAndSpeakFx,
  fn: () => true,
  target: $isSpeaking,
});

sample({
  clock: [seekAndSpeakFx.done, seekAndSpeakFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length,
  fn: () => false,
  target: $isSpeaking,
});

// 14.4. Сбросить при завершении seek на последнем предложении
sample({
  clock: [seekAndSpeakFx.done, seekAndSpeakFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length,
  fn: () => 0,
  target: [$progress, $currentWordIndex],
});

sample({
  clock: [seekAndSpeakFx.done, seekAndSpeakFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex, timerId: $wordTimerId },
  filter: ({ sentences, index, timerId }) => index + 1 >= sentences.length && timerId !== null,
  fn: ({ timerId }) => timerId,
  target: stopWordTimerFx,
});

// 14.5. Остановить таймер при ошибке seek
sample({
  clock: seekAndSpeakFx.fail,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

// 15. Вычислить прогресс по словам
sample({
  clock: $currentWordIndex,
  source: { wordIndex: $currentWordIndex, structure: $textStructure },
  fn: ({ wordIndex, structure }) => {
    if (!structure || structure.totalWordCount === 0) {
      return 0;
    }
    return Math.round((wordIndex / structure.totalWordCount) * 100);
  },
  target: $progress,
});

// 16. Остановить таймер при ошибке воспроизведения
sample({
  clock: speakSentenceFx.fail,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

export const speechModel = {
  $isSpeaking,
  $speechRate,
  $progress,
  $sentences,
  $currentSentenceIndex,
  $currentWordIndex,
  $textStructure,
  $selectedVoice,
  $availableVoices,
  playPressed,
  stopPressed,
  rateChanged,
  voiceSelected,
  seekToWord,
  loadVoicesFx,
};
