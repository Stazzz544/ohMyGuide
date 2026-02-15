import { createStore, createEvent, createEffect, sample } from 'effector';
import * as Speech from 'expo-speech';
import { speechService, splitTextIntoChunks } from '@app/shared/lib';
import { DEFAULT_SPEECH_RATE, MIN_SPEECH_RATE, MAX_SPEECH_RATE, MAX_CHUNK_SIZE } from '@app/shared/config';

// --- Effects ---

const speakFx = createEffect(
  ({ text, rate, voice }: { text: string; rate: number; voice?: string }): Promise<void> => {
    return new Promise((resolve, reject) => {
      speechService.speak({
        text,
        rate,
        voice,
        onDone: resolve,
        onError: reject,
      });
    });
  },
);

const stopFx = createEffect((): void => {
  speechService.stop();
});

const loadVoicesFx = createEffect(async (): Promise<Speech.Voice[]> => {
  return speechService.getRussianVoices();
});

// --- Stores ---

const $isSpeaking = createStore<boolean>(false);
const $speechRate = createStore<number>(DEFAULT_SPEECH_RATE);
const $chunks = createStore<string[]>([]);
const $currentChunkIndex = createStore<number>(0);
const $selectedVoice = createStore<string | null>(null);
const $availableVoices = createStore<Speech.Voice[]>([]);
const $progress = createStore<number>(0);

// --- Events ---

const playPressed = createEvent<string>();
const stopPressed = createEvent();
const rateChanged = createEvent<number>();
const voiceSelected = createEvent<string>();

// --- Логика ---

// Остановить текущую озвучку перед новой
sample({
  clock: playPressed,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  target: stopFx,
});

// 1. Разбить текст на чанки при нажатии "Прослушать"
sample({
  clock: playPressed,
  fn: (text) => splitTextIntoChunks(text, MAX_CHUNK_SIZE),
  target: $chunks,
});

// 2. Сбросить индекс на 0
sample({
  clock: playPressed,
  fn: () => 0,
  target: $currentChunkIndex,
});

// 3. Запустить воспроизведение первого чанка
sample({
  clock: $chunks,
  source: { chunks: $chunks, rate: $speechRate, voice: $selectedVoice },
  filter: ({ chunks }) => chunks.length > 0,
  fn: ({ chunks, rate, voice }) => ({
    text: chunks[0],
    rate,
    voice: voice ?? undefined,
  }),
  target: speakFx,
});

// 4. При завершении чанка - воспроизвести следующий
sample({
  clock: speakFx.done,
  source: { chunks: $chunks, index: $currentChunkIndex, rate: $speechRate, voice: $selectedVoice },
  filter: ({ chunks, index }) => index + 1 < chunks.length,
  fn: ({ chunks, index, rate, voice }) => {
    const nextIndex = index + 1;
    return {
      text: chunks[nextIndex],
      rate,
      voice: voice ?? undefined,
    };
  },
  target: speakFx,
});

// 5. Обновить индекс после успешного воспроизведения
sample({
  clock: speakFx.done,
  source: $currentChunkIndex,
  fn: (index) => index + 1,
  target: $currentChunkIndex,
});

// 6. Остановка
sample({
  clock: stopPressed,
  target: stopFx,
});

// 7. Сбросить чанки при остановке
sample({
  clock: stopPressed,
  fn: () => [],
  target: $chunks,
});

// 8. Сбросить индекс при остановке
sample({
  clock: stopPressed,
  fn: () => 0,
  target: $currentChunkIndex,
});

// 9. Состояние "говорит"
sample({
  clock: speakFx,
  fn: () => true,
  target: $isSpeaking,
});

sample({
  clock: [speakFx.done, speakFx.fail, stopFx.done],
  fn: () => false,
  target: $isSpeaking,
});

// 10. Сбросить прогресс при остановке
sample({
  clock: [speakFx.done, speakFx.fail, stopFx.done],
  source: { chunks: $chunks, index: $currentChunkIndex },
  filter: ({ chunks, index }) => index + 1 >= chunks.length || chunks.length === 0,
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

// 14. Вычислить прогресс
sample({
  clock: $currentChunkIndex,
  source: { index: $currentChunkIndex, chunks: $chunks },
  fn: ({ index, chunks }) => {
    if (chunks.length === 0) {
      return 0;
    }
    return Math.round(((index + 1) / chunks.length) * 100);
  },
  target: $progress,
});

export const speechModel = {
  $isSpeaking,
  $speechRate,
  $progress,
  $selectedVoice,
  $availableVoices,
  playPressed,
  stopPressed,
  rateChanged,
  voiceSelected,
  loadVoicesFx,
};
