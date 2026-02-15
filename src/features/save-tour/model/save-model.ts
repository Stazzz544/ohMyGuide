import { createEvent, sample } from 'effector';
import { tourStore } from '@app/entities/tour';

// Событие сохранения тура из экрана генерации
const saveTourPressed = createEvent<{ placeName: string; generatedText: string }>();

sample({
  clock: saveTourPressed,
  target: tourStore.tourSaved,
});

export const saveModel = {
  saveTourPressed,
};
