import { combine, createEffect, createEvent, createStore, sample } from 'effector';
import { v4 as uuidv4 } from 'uuid';
import { storage } from '@app/shared/lib';
import { STORAGE_KEYS } from '@app/shared/config';
import { placeToFavorite } from '../lib/favorite-place';

import type { Place } from '@app/entities/place';
import type { FavoriteGroup, FavoriteGroupId, FavoritePlace } from './types';

type FavoritesData = {
  favorites: FavoritePlace[];
  groups: FavoriteGroup[];
};

type GroupDraft = {
  name: string;
  color: string | null;
  // Если задан — новая группа сразу назначается этому месту
  placeId?: string;
};

const loadFx = createEffect(async (): Promise<FavoritesData> => ({
  favorites: (await storage.get<FavoritePlace[]>(STORAGE_KEYS.FAVORITES)) ?? [],
  groups: (await storage.get<FavoriteGroup[]>(STORAGE_KEYS.FAVORITE_GROUPS)) ?? [],
}));

const saveFavoritesFx = createEffect(async (favorites: FavoritePlace[]): Promise<void> => {
  await storage.set(STORAGE_KEYS.FAVORITES, favorites);
});

const saveGroupsFx = createEffect(async (groups: FavoriteGroup[]): Promise<void> => {
  await storage.set(STORAGE_KEYS.FAVORITE_GROUPS, groups);
});

const $favorites = createStore<FavoritePlace[]>([]);
const $groups = createStore<FavoriteGroup[]>([]);
// До загрузки не сохраняем: иначе пустой стор перезапишет сохранённое избранное
const $isLoaded = createStore<boolean>(false);
const $favoriteIds = $favorites.map((favorites) => new Set(favorites.map((favorite) => favorite.id)));
const $favoritesByGroup = combine($favorites, $groups, (favorites, groups) =>
  groups.map((group) => ({ group, favorites: favorites.filter((favorite) => favorite.groupId === group.id) })),
);

const favoritesLoaded = createEvent();
const favoriteToggled = createEvent<Place>();
const favoriteGroupSet = createEvent<{ placeId: string; groupId: FavoriteGroupId | null }>();
const favoriteColorSet = createEvent<{ placeId: string; color: string | null }>();
const groupCreated = createEvent<GroupDraft>();
const groupUpdated = createEvent<{ id: FavoriteGroupId; name: string; color: string | null }>();
const groupDeleted = createEvent<FavoriteGroupId>();

sample({
  clock: favoritesLoaded,
  target: loadFx,
});

sample({
  clock: loadFx.doneData,
  fn: ({ favorites }) => favorites,
  target: $favorites,
});

sample({
  clock: loadFx.doneData,
  fn: ({ groups }) => groups,
  target: $groups,
});

sample({
  clock: loadFx.finally,
  fn: () => true,
  target: $isLoaded,
});

sample({
  clock: favoriteToggled,
  source: $favorites,
  fn: (favorites, place) =>
    favorites.some((favorite) => favorite.id === place.id)
      ? favorites.filter((favorite) => favorite.id !== place.id)
      : [placeToFavorite(place), ...favorites],
  target: $favorites,
});

sample({
  clock: favoriteGroupSet,
  source: $favorites,
  fn: (favorites, { placeId, groupId }) =>
    favorites.map((favorite) => (favorite.id === placeId ? { ...favorite, groupId } : favorite)),
  target: $favorites,
});

sample({
  clock: favoriteColorSet,
  source: $favorites,
  fn: (favorites, { placeId, color }) =>
    favorites.map((favorite) => (favorite.id === placeId ? { ...favorite, color } : favorite)),
  target: $favorites,
});

// id новой группы генерируем один раз и раскладываем по сторам — иначе у группы и места разойдутся id
const groupPrepared = sample({
  clock: groupCreated,
  fn: ({ name, color, placeId }): { group: FavoriteGroup; placeId?: string } => ({
    group: { id: uuidv4(), name, color, createdAt: new Date().toISOString() },
    placeId,
  }),
});

sample({
  clock: groupPrepared,
  source: $groups,
  fn: (groups, { group }) => [...groups, group],
  target: $groups,
});

sample({
  clock: groupPrepared,
  filter: ({ placeId }) => placeId !== undefined,
  fn: ({ group, placeId }) => ({ placeId: placeId ?? '', groupId: group.id }),
  target: favoriteGroupSet,
});

sample({
  clock: groupUpdated,
  source: $groups,
  fn: (groups, { id, name, color }) => groups.map((group) => (group.id === id ? { ...group, name, color } : group)),
  target: $groups,
});

sample({
  clock: groupDeleted,
  source: $groups,
  fn: (groups, id) => groups.filter((group) => group.id !== id),
  target: $groups,
});

sample({
  clock: groupDeleted,
  source: $favorites,
  fn: (favorites, id) =>
    favorites.map((favorite) => (favorite.groupId === id ? { ...favorite, groupId: null } : favorite)),
  target: $favorites,
});

sample({
  clock: $favorites.updates,
  source: $isLoaded,
  filter: Boolean,
  fn: (_, favorites) => favorites,
  target: saveFavoritesFx,
});

sample({
  clock: $groups.updates,
  source: $isLoaded,
  filter: Boolean,
  fn: (_, groups) => groups,
  target: saveGroupsFx,
});

export const favoritesStore = {
  $favorites,
  $groups,
  $favoriteIds,
  $favoritesByGroup,
  favoritesLoaded,
  favoriteToggled,
  favoriteGroupSet,
  favoriteColorSet,
  groupCreated,
  groupUpdated,
  groupDeleted,
};
