import { distanceM } from '@app/shared/lib';

import type { GeoPoint } from '@app/shared/lib';
import type { Place } from '@app/entities/place';
import type { FavoriteGroup, FavoritePlace } from '../model/types';

export const FAVORITE_PALETTE = ['#3b82f6', '#22c55e', '#a855f7', '#f97316', '#ec4899', '#14b8a6', '#64748b'];

export const placeToFavorite = (place: Place): FavoritePlace => ({
  id: place.id,
  title: place.title,
  label: place.label,
  description: place.description,
  lat: place.lat,
  lon: place.lon,
  thumbnail: place.thumbnail,
  kind: place.kind,
  source: place.source,
  fame: place.fame,
  groupId: null,
  color: null,
  addedAt: new Date().toISOString(),
});

export const favoriteToPlace = (favorite: FavoritePlace, origin: GeoPoint | null): Place => ({
  id: favorite.id,
  title: favorite.title,
  label: favorite.label,
  description: favorite.description,
  lat: favorite.lat,
  lon: favorite.lon,
  distanceM: origin ? distanceM(origin, favorite) : 0,
  fame: favorite.fame,
  thumbnail: favorite.thumbnail,
  source: favorite.source,
  kind: favorite.kind,
});

export const resolveFavoriteColor = (favorite: FavoritePlace, groups: FavoriteGroup[], defaultColor: string): string =>
  favorite.color ?? groups.find((group) => group.id === favorite.groupId)?.color ?? defaultColor;
