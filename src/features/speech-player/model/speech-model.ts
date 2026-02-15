import { createStore, createEvent, createEffect, sample } from 'effector';
import { speechService } from '@app/shared/lib';
import { DEFAULT_SPEECH_RATE, MIN_SPEECH_RATE, MAX_SPEECH_RATE } from '@app/shared/config';

// --- Effects ---

const speakFx = createEffect(
  ({ text, rate }: { text: string; rate: number }): Promise<void> => {
    return new Promise((resolve, reject) => {
      speechService.speak({
        text,
        rate,
        onDone: resolve,
        onError: reject,
      });
    });
  },
);

const stopFx = createEffect((): void => {
  speechService.stop();
});

// --- Stores ---

const $isSpeaking = createStore<boolean>(false);
const $speechRate = createStore<number>(DEFAULT_SPEECH_RATE);

// --- Events ---

const playPressed = createEvent<string>();
const stopPressed = createEvent();
const rateChanged = createEvent<number>();

// Остановить текущую озвучку перед новой
sample({
  clock: playPressed,
  source: $isSpeaking,
  filter: (isSpeaking) => isSpeaking,
  target: stopFx,
});

// Запуск озвучки
sample({
  clock: playPressed,
  source: $speechRate,
  fn: (rate, text) => ({ text, rate }),
  target: speakFx,
});

// Остановка
sample({
  clock: stopPressed,
  target: stopFx,
});

// Состояние "говорит"
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

// Скорость речи
sample({
  clock: rateChanged,
  filter: (rate) => rate >= MIN_SPEECH_RATE && rate <= MAX_SPEECH_RATE,
  target: $speechRate,
});

export const speechModel = {
  $isSpeaking,
  $speechRate,
  playPressed,
  stopPressed,
  rateChanged,
};
