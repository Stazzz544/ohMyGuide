import type { PlaceKind, PlaceSource } from '@app/entities/place';

export type FavoriteGroupId = string;

export type FavoriteGroup = {
  id: FavoriteGroupId;
  name: string;
  // null — цвет по умолчанию (жёлтый с красной обводкой)
  color: string | null;
  createdAt: string;
};

// Снимок места на момент добавления: избранное показывается где угодно без повторных запросов
export type FavoritePlace = {
  id: string;
  title: string;
  label: string;
  description: string;
  lat: number;
  lon: number;
  thumbnail: string | null;
  kind: PlaceKind;
  source: PlaceSource;
  fame: number;
  groupId: FavoriteGroupId | null;
  // null — берётся цвет группы
  color: string | null;
  addedAt: string;
};
