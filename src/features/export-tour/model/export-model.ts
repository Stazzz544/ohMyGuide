import { createEvent, createEffect, createStore, sample } from 'effector';
import { exportTour } from '@app/shared/lib';

import type { ExportTourParams, ExportFormat, ExportResult } from './types';

// Effects
const exportTourFx = createEffect(
  async (params: { tourParams: ExportTourParams; format: ExportFormat }): Promise<ExportResult> => {
    return exportTour(params.tourParams, params.format);
  }
);

// Stores
const $isExporting = exportTourFx.pending;
const $lastExportResult = createStore<ExportResult | null>(null);

// Events
const exportPressed = createEvent<{ tourParams: ExportTourParams; format?: ExportFormat }>();
const exportResultDismissed = createEvent();

// Логика
sample({
  clock: exportPressed,
  fn: ({ tourParams, format = 'txt' }) => ({ tourParams, format }),
  target: exportTourFx,
});

sample({
  clock: exportTourFx.doneData,
  target: $lastExportResult,
});

sample({
  clock: exportTourFx.failData,
  fn: (error): ExportResult => ({
    success: false,
    error: error instanceof Error ? error.message : 'Неизвестная ошибка',
  }),
  target: $lastExportResult,
});

sample({
  clock: exportResultDismissed,
  fn: () => null,
  target: $lastExportResult,
});

export const exportModel = {
  $isExporting,
  $lastExportResult,
  exportPressed,
  exportResultDismissed,
};
