import { createStore, createEvent, createEffect, sample } from 'effector';
import * as Speech from 'expo-speech';
import { speechService, splitIntoSentences } from '@app/shared/lib';
import { DEFAULT_SPEECH_RATE, MIN_SPEECH_RATE, MAX_SPEECH_RATE } from '@app/shared/config';

// --- Effects ---

const speakSentenceFx = createEffect(
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
const $sentences = createStore<string[]>([]);
const $currentSentenceIndex = createStore<number>(0);
const $selectedVoice = createStore<string | null>(null);
const $availableVoices = createStore<Speech.Voice[]>([]);
const $progress = createStore<number>(0);
const $isChangingSpeed = createStore<boolean>(false);

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

// 1. Разбить текст на предложения при нажатии "Прослушать"
sample({
  clock: playPressed,
  fn: (text) => splitIntoSentences(text),
  target: $sentences,
});

// 2. Сбросить индекс на 0
sample({
  clock: playPressed,
  fn: () => 0,
  target: $currentSentenceIndex,
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

// 4. При завершении предложения - воспроизвести следующее
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

// 5. Обновить индекс после успешного воспроизведения
sample({
  clock: speakSentenceFx.done,
  source: $currentSentenceIndex,
  fn: (index) => index + 1,
  target: $currentSentenceIndex,
});

// 6. Остановка
sample({
  clock: stopPressed,
  target: stopFx,
});

// 7. Сбросить предложения при остановке
sample({
  clock: stopPressed,
  fn: () => [],
  target: $sentences,
});

// 8. Сбросить индекс при остановке
sample({
  clock: stopPressed,
  fn: () => 0,
  target: $currentSentenceIndex,
});

// 9. Состояние "говорит"
sample({
  clock: speakSentenceFx,
  fn: () => true,
  target: $isSpeaking,
});

// Установить false при завершении или ошибке предложения
sample({
  clock: [speakSentenceFx.done, speakSentenceFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length, // Только если это последнее предложение
  fn: () => false,
  target: $isSpeaking,
});

// Установить false при stopFx.done ТОЛЬКО если НЕ меняем скорость
sample({
  clock: stopFx.done,
  source: $isChangingSpeed,
  filter: (isChangingSpeed) => !isChangingSpeed,
  fn: () => false,
  target: $isSpeaking,
});

// 10. Сбросить прогресс при завершении всех предложений
sample({
  clock: [speakSentenceFx.done, speakSentenceFx.fail],
  source: { sentences: $sentences, index: $currentSentenceIndex },
  filter: ({ sentences, index }) => index + 1 >= sentences.length,
  fn: () => 0,
  target: $progress,
});

// Сбросить прогресс при ручной остановке (не при смене скорости)
sample({
  clock: stopFx.done,
  source: $isChangingSpeed,
  filter: (isChangingSpeed) => !isChangingSpeed,
  fn: () => 0,
  target: $progress,
});

// 11. Скорость речи
sample({
  clock: rateChanged,
  filter: (rate) => rate >= MIN_SPEECH_RATE && rate <= MAX_SPEECH_RATE,
  target: $speechRate,
});

// 11a. При изменении скорости во время воспроизведения - установить флаг
sample({
  clock: rateChanged,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  fn: () => true,
  target: $isChangingSpeed,
});

// 11b. Остановить текущее предложение при изменении скорости
sample({
  clock: rateChanged,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  target: stopFx,
});

// 11c. После остановки - если это была смена скорости, перезапустить текущее предложение
sample({
  clock: stopFx.done,
  source: {
    isChangingSpeed: $isChangingSpeed,
    sentences: $sentences,
    index: $currentSentenceIndex,
    rate: $speechRate,
    voice: $selectedVoice,
  },
  filter: ({ isChangingSpeed, sentences, index }) => isChangingSpeed && index < sentences.length,
  fn: ({ sentences, index, rate, voice }) => ({
    text: sentences[index],  // ← Перезапускаем ТЕКУЩЕЕ предложение
    rate,
    voice: voice ?? undefined,
  }),
  target: speakSentenceFx,
});

// 11e. Сбросить флаг после перезапуска
sample({
  clock: speakSentenceFx,
  source: $isChangingSpeed,
  filter: (isChangingSpeed) => isChangingSpeed,
  fn: () => false,
  target: $isChangingSpeed,
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
  clock: $currentSentenceIndex,
  source: { index: $currentSentenceIndex, sentences: $sentences },
  fn: ({ index, sentences }) => {
    if (sentences.length === 0) {
      return 0;
    }
    return Math.round(((index + 1) / sentences.length) * 100);
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
