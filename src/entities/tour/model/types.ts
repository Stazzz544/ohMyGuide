import type { FolderId } from '@app/entities/folder';

export type TourId = string;

export type Tour = {
  id: TourId;
  placeName: string;
  generatedText: string;
  createdAt: string; // ISO 8601
  folderId: FolderId | null; // null = в корне, без папки
};

// Кеш последнего сгенерированного тура
export type CachedTour = {
  placeName: string;
  generatedText: string;
  cachedAt: string; // ISO 8601
};
