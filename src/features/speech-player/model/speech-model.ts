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

type QueueRequest = {
  sentences: string[];
  startIndex: number;
  rate: number;
  voice?: string;
  generation: number;
};

type QueueEvent = {
  index: number;
  generation: number;
};

type PlayPosition = {
  sentenceIndex: number;
  wordIndex: number;
};

// --- Events ---

const playPressed = createEvent<string>();
const stopPressed = createEvent();
const rateChanged = createEvent<number>();
const voiceSelected = createEvent<string>();
const seekToWord = createEvent<number>();
const wordTimerTicked = createEvent();
const textAvailable = createEvent<string>();

const queueStartRequested = createEvent<PlayPosition>();
const playbackStopped = createEvent();
const queuedSentenceStarted = createEvent<QueueEvent>();
const queuedSentenceDone = createEvent<QueueEvent>();
const queueFailed = createEvent<number>();

// --- Effects ---

// Все оставшиеся предложения сразу уходят в очередь синтезатора: он дочитывает их сам, даже когда
// Android заморозил свёрнутое приложение. Цепочка «следующее предложение по onDone» в фоне обрывалась
const speakQueueFx = createEffect(({ sentences, startIndex, rate, voice, generation }: QueueRequest): void => {
  speechService.stop();
  sentences.slice(startIndex).forEach((text, offset) => {
    const index = startIndex + offset;
    speechService.speak({
      text,
      rate,
      voice,
      onStart: () => queuedSentenceStarted({ index, generation }),
      onDone: () => queuedSentenceDone({ index, generation }),
      onError: () => queueFailed(generation),
    });
  });
});

const stopFx = createEffect((): void => {
  speechService.stop();
});

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
// События синтезатора от прошлой очереди (после стопа или перемотки) отбрасываем по номеру очереди
const $generation = createStore<number>(0);

// События текущей очереди
const sentenceStarted = sample({
  clock: queuedSentenceStarted,
  source: $generation,
  filter: (generation, event) => event.generation === generation,
  fn: (_, { index }) => index,
});

const sentenceDone = sample({
  clock: queuedSentenceDone,
  source: $generation,
  filter: (generation, event) => event.generation === generation,
  fn: (_, { index }) => index,
});

const playbackFailed = sample({
  clock: queueFailed,
  source: $generation,
  filter: (generation, failedGeneration) => failedGeneration === generation,
});

// --- Логика ---

// 0. textAvailable — строим структуру текста заранее (до нажатия Play)

sample({
  clock: textAvailable,
  fn: (text) => (text.trim().length > 0 ? splitTextWithWordStructure(text) : null),
  target: $textStructure,
});

// Извлечь плоский массив строк предложений для TTS
sample({
  clock: $textStructure,
  fn: (structure) => structure?.allSentences.map((s) => s.text) ?? [],
  target: $sentences,
});

// Сбросить позицию при новом тексте
sample({
  clock: textAvailable,
  fn: () => 0,
  target: [$currentSentenceIndex, $currentWordIndex, $progress],
});

// Остановить озвучку если шла при смене текста
sample({
  clock: textAvailable,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  target: playbackStopped,
});

// 1. Fallback: если $textStructure ещё не построен — построить из текста
sample({
  clock: playPressed,
  source: $textStructure,
  filter: (structure) => structure === null,
  fn: (_, text) => splitTextWithWordStructure(text),
  target: $textStructure,
});

// 2. Рассчитать позицию старта и запустить очередь
sample({
  clock: playPressed,
  source: { structure: $textStructure, currentWordIndex: $currentWordIndex },
  filter: ({ structure }) => structure !== null && structure.allSentences.length > 0,
  fn: ({ structure, currentWordIndex }): PlayPosition => {
    const idx = structure!.allSentences.findIndex(
      (s) => currentWordIndex >= s.globalWordStart && currentWordIndex <= s.globalWordEnd,
    );
    return {
      sentenceIndex: idx >= 0 ? idx : 0,
      wordIndex: idx >= 0 ? currentWordIndex : 0,
    };
  },
  target: queueStartRequested,
});

// 3. Запуск очереди с позиции: play, перемотка, смена скорости или голоса во время чтения
sample({
  clock: queueStartRequested,
  fn: ({ sentenceIndex }) => sentenceIndex,
  target: $currentSentenceIndex,
});

sample({
  clock: queueStartRequested,
  fn: ({ wordIndex }) => wordIndex,
  target: $currentWordIndex,
});

sample({
  clock: queueStartRequested,
  source: $wordTimerId,
  target: stopWordTimerFx,
});

// Номер новой очереди считаем один раз: два sample на одном clock, читающие и пишущие $generation, разъедутся
const queueRequested = sample({
  clock: queueStartRequested,
  source: { sentences: $sentences, rate: $speechRate, voice: $selectedVoice, generation: $generation },
  fn: ({ sentences, rate, voice, generation }, { sentenceIndex }): QueueRequest => ({
    sentences,
    startIndex: sentenceIndex,
    rate,
    voice: voice ?? undefined,
    generation: generation + 1,
  }),
});

sample({
  clock: queueRequested,
  fn: ({ generation }) => generation,
  target: $generation,
});

sample({
  clock: queueRequested,
  target: speakQueueFx,
});

sample({
  clock: queueStartRequested,
  fn: () => true,
  target: $isSpeaking,
});

// 4. Синтезатор начал предложение — подсветка и таймер слов (таймер стартует только по реальному onStart)
// Слово берём из начала предложения, кроме стартового: при продолжении подсветка остаётся на месте
const sentencePositioned = sample({
  clock: sentenceStarted,
  source: { structure: $textStructure, sentenceIndex: $currentSentenceIndex, wordIndex: $currentWordIndex },
  fn: ({ structure, sentenceIndex, wordIndex }, index): PlayPosition => ({
    sentenceIndex: index,
    wordIndex: index === sentenceIndex ? wordIndex : (structure?.allSentences[index]?.globalWordStart ?? wordIndex),
  }),
});

sample({
  clock: sentencePositioned,
  fn: ({ wordIndex }) => wordIndex,
  target: $currentWordIndex,
});

sample({
  clock: sentencePositioned,
  fn: ({ sentenceIndex }) => sentenceIndex,
  target: $currentSentenceIndex,
});

sample({
  clock: sentenceStarted,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

sample({
  clock: sentenceStarted,
  source: { structure: $textStructure, rate: $speechRate },
  filter: ({ structure }, index) => structure?.allSentences[index] !== undefined,
  fn: ({ structure, rate }, index) => {
    const sentence = structure!.allSentences[index];
    return {
      intervalMs: calcWordIntervalMs(sentence.text, sentence.wordCount, rate),
      onTick: () => wordTimerTicked(),
    };
  },
  target: startWordTimerFx,
});

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

// 6. Синтезатор закончил предложение — остановить таймер и поправить дрейф подсветки
sample({
  clock: sentenceDone,
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

sample({
  clock: sentenceDone,
  source: $textStructure,
  filter: (structure) => structure !== null,
  fn: (structure, index) => (structure!.allSentences[index]?.globalWordEnd ?? 0) + 1,
  target: $currentWordIndex,
});

// 7. Последнее предложение дочитано — сбросить состояние
const queueFinished = sample({
  clock: sentenceDone,
  source: $sentences,
  filter: (sentences, index) => index + 1 >= sentences.length,
});

sample({
  clock: queueFinished,
  fn: () => false,
  target: $isSpeaking,
});

sample({
  clock: queueFinished,
  fn: () => 0,
  target: [$progress, $currentWordIndex],
});

sample({
  clock: queueFinished,
  fn: () => null,
  target: $wordTimerId,
});

// 8. Остановка
sample({
  clock: stopPressed,
  target: playbackStopped,
});

sample({
  clock: stopPressed,
  fn: () => 0,
  target: [$currentSentenceIndex, $currentWordIndex],
});

sample({
  clock: playbackStopped,
  target: stopFx,
});

sample({
  clock: playbackStopped,
  source: $generation,
  fn: (generation) => generation + 1,
  target: $generation,
});

sample({
  clock: [playbackStopped, playbackFailed],
  source: $wordTimerId,
  filter: (timerId) => timerId !== null,
  target: stopWordTimerFx,
});

sample({
  clock: [playbackStopped, playbackFailed],
  fn: () => null,
  target: $wordTimerId,
});

sample({
  clock: [playbackStopped, playbackFailed],
  fn: () => false,
  target: $isSpeaking,
});

sample({
  clock: stopFx.done,
  fn: () => 0,
  target: $progress,
});

// 9. Скорость и голос: меняются сразу — очередь перезапускается с текущего предложения
sample({
  clock: rateChanged,
  filter: (rate) => rate >= MIN_SPEECH_RATE && rate <= MAX_SPEECH_RATE,
  target: $speechRate,
});

sample({
  clock: voiceSelected,
  target: $selectedVoice,
});

sample({
  clock: [$speechRate.updates, $selectedVoice.updates],
  source: { isSpeaking: $isSpeaking, sentenceIndex: $currentSentenceIndex, wordIndex: $currentWordIndex },
  filter: ({ isSpeaking }) => isSpeaking,
  fn: ({ sentenceIndex, wordIndex }): PlayPosition => ({ sentenceIndex, wordIndex }),
  target: queueStartRequested,
});

// 10. Загрузка голосов
sample({
  clock: loadVoicesFx.doneData,
  target: $availableVoices,
});

// 11. Перемотка к слову
const seekTargetChosen = sample({
  clock: seekToWord,
  source: $textStructure,
  filter: (structure, wordIndex) => structure !== null && wordIndex >= 0 && wordIndex < structure.totalWordCount,
  fn: (structure, wordIndex): PlayPosition => ({
    sentenceIndex: structure!.allWords[wordIndex].sentenceIndex,
    wordIndex,
  }),
});

// Во время чтения — перезапустить очередь с предложения, где это слово
sample({
  clock: seekTargetChosen,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  fn: (_, position) => position,
  target: queueStartRequested,
});

// Без чтения — только сдвинуть позицию, Play продолжит с неё
sample({
  clock: seekTargetChosen,
  source: $isSpeaking,
  filter: (isSpeaking) => !isSpeaking,
  fn: (_, { wordIndex }) => wordIndex,
  target: $currentWordIndex,
});

sample({
  clock: seekTargetChosen,
  source: $isSpeaking,
  filter: (isSpeaking) => !isSpeaking,
  fn: (_, { sentenceIndex }) => sentenceIndex,
  target: $currentSentenceIndex,
});

// 12. Вычислить прогресс по словам
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
  textAvailable,
  loadVoicesFx,
};
