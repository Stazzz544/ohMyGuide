import { createEvent, createEffect, sample } from 'effector';
import { shareTour } from '@app/shared/lib';
import type { ShareTourParams } from '@app/shared/lib';

const shareTourFx = createEffect(shareTour);
const sharePressed = createEvent<ShareTourParams>();

sample({
  clock: sharePressed,
  target: shareTourFx,
});

export const shareModel = {
  sharePressed,
};
