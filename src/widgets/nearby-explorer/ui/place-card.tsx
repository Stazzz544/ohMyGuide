import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX, useCallback, useState } from 'react';
import { useUnit } from 'effector-react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button } from '@app/shared/ui';
import { BORDER_RADIUS } from '@app/shared/config';
import { formatDistance, formatDuration } from '@app/shared/lib';
import { nearbyModel } from '@app/features/nearby-places';
import { routeModel } from '@app/features/walking-route';
import { ColorPalette, favoritesStore, resolveFavoriteColor } from '@app/entities/favorite';
import { explorerModel } from '../model/explorer-model';
import { FavoriteGroupPicker } from './favorite-group-picker';

const ACTION_SIZE = 48;

export const PlaceCard = (): JSX.Element | null => {
  const { colors } = useTheme();
  const {
    place,
    route,
    isRouteLoading,
    routeError,
    isPreparingTour,
    selectionCleared,
    routeCleared,
    routeRequested,
    tourRequested,
    navigatorOpened,
    isArrived,
    articleOpened,
    favorites,
    groups,
    favoriteToggled,
    favoriteColorSet,
  } = useUnit({
    place: nearbyModel.$selectedPlace,
    route: routeModel.$route,
    isRouteLoading: routeModel.$isLoading,
    routeError: routeModel.$error,
    isPreparingTour: explorerModel.$isPreparingTour,
    selectionCleared: nearbyModel.selectionCleared,
    routeCleared: routeModel.routeCleared,
    routeRequested: explorerModel.routeRequested,
    tourRequested: explorerModel.tourRequested,
    navigatorOpened: explorerModel.navigatorOpened,
    isArrived: explorerModel.$isArrived,
    articleOpened: explorerModel.articleOpened,
    favorites: favoritesStore.$favorites,
    groups: favoritesStore.$groups,
    favoriteToggled: favoritesStore.favoriteToggled,
    favoriteColorSet: favoritesStore.favoriteColorSet,
  });
  const [isGroupPickerVisible, setGroupPickerVisible] = useState(false);
  const [isPaletteVisible, setPaletteVisible] = useState(false);

  const handleTourPress = useCallback(() => {
    tourRequested();
    router.navigate('/');
  }, [tourRequested]);

  if (!place) {
    return null;
  }

  const favorite = favorites.find((item) => item.id === place.id) ?? null;
  const favoriteGroup = groups.find((group) => group.id === favorite?.groupId) ?? null;
  const groupColor = favoriteGroup?.color ?? colors.favoriteDefault;

  return (
    <View style={[styles.card, { borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <View style={styles.titleBox}>
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={2}>
            {place.label}
          </Text>
          {place.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
              {place.description}
            </Text>
          ) : null}
          <Pressable onPress={articleOpened} hitSlop={6} accessibilityRole="link">
            <Text style={[styles.link, { color: colors.primary }]}>Статья в Википедии</Text>
          </Pressable>
        </View>
        <Pressable
          onPress={() => favoriteToggled(place)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={favorite ? 'Убрать из избранного' : 'Добавить в избранное'}
        >
          <Ionicons
            name={favorite ? 'star' : 'star-outline'}
            size={24}
            color={favorite ? colors.favoriteDefault : colors.textSecondary}
          />
        </Pressable>
        <Pressable
          onPress={selectionCleared}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel="Вернуться к списку"
        >
          <Ionicons name="close" size={24} color={colors.textSecondary} />
        </Pressable>
      </View>

      {favorite && (
        <View style={styles.favoriteRow}>
          <Pressable
            onPress={() => setGroupPickerVisible(true)}
            accessibilityRole="button"
            style={[styles.chip, { borderColor: colors.border }]}
          >
            <Ionicons name="folder-outline" size={16} color={colors.textSecondary} />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]} numberOfLines={1}>
              {favoriteGroup?.name ?? 'Без группы'}
            </Text>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </Pressable>
          <Pressable
            onPress={() => setPaletteVisible((isVisible) => !isVisible)}
            accessibilityRole="button"
            accessibilityLabel="Цвет метки"
            style={[styles.chip, { borderColor: colors.border }]}
          >
            <View
              style={[
                styles.colorDot,
                {
                  backgroundColor: resolveFavoriteColor(favorite, groups, colors.favoriteDefault),
                  borderColor: colors.favoriteStroke,
                },
              ]}
            />
            <Text style={[styles.chipLabel, { color: colors.textPrimary }]}>Цвет</Text>
          </Pressable>
        </View>
      )}

      {favorite && isPaletteVisible && (
        <ColorPalette
          value={favorite.color}
          onChange={(color) => favoriteColorSet({ placeId: favorite.id, color })}
          defaultLabel={favoriteGroup ? 'Как у группы' : 'По умолчанию'}
          defaultColor={groupColor}
        />
      )}

      {favorite && isGroupPickerVisible && (
        <FavoriteGroupPicker
          placeId={favorite.id}
          currentGroupId={favorite.groupId}
          onClose={() => setGroupPickerVisible(false)}
        />
      )}

      {route && isArrived && (
        <View style={[styles.route, { backgroundColor: `${colors.success}26` }]}>
          <Ionicons name="flag-outline" size={18} color={colors.success} />
          <Text style={[styles.routeDistance, { color: colors.textPrimary }]}>Вы на месте</Text>
          <Pressable onPress={routeCleared} hitSlop={8} accessibilityRole="button" style={styles.routeClear}>
            <Text style={[styles.routeClearLabel, { color: colors.textSecondary }]}>Убрать</Text>
          </Pressable>
        </View>
      )}

      {route && !isArrived && (
        <View style={[styles.route, { backgroundColor: `${colors.primary}1f` }]}>
          <Text style={[styles.routeTime, { color: colors.primary }]}>{formatDuration(route.durationS)}</Text>
          <Text style={[styles.routeDistance, { color: colors.textSecondary }]}>
            {`${formatDistance(route.distanceM)} пешком`}
          </Text>
          <Pressable onPress={routeCleared} hitSlop={8} accessibilityRole="button" style={styles.routeClear}>
            <Text style={[styles.routeClearLabel, { color: colors.textSecondary }]}>Убрать</Text>
          </Pressable>
        </View>
      )}

      {!route && (
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          {`${formatDistance(place.distanceM)} по прямой`}
        </Text>
      )}

      {routeError && <Text style={[styles.description, { color: colors.danger }]}>{routeError}</Text>}

      <View style={styles.actions}>
        {!route && <Button label="Маршрут" onPress={routeRequested} loading={isRouteLoading} style={styles.action} />}
        <Button
          label="Экскурсия"
          variant={route ? 'fill' : 'outline'}
          onPress={handleTourPress}
          loading={isPreparingTour}
          style={styles.action}
        />
        <Pressable
          onPress={navigatorOpened}
          accessibilityRole="button"
          accessibilityLabel="Открыть в навигаторе"
          style={({ pressed }) => [styles.iconButton, { borderColor: colors.primary, opacity: pressed ? 0.7 : 1 }]}
        >
          <Ionicons name="navigate-outline" size={22} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
    gap: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  favoriteRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '100%',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
    flexShrink: 1,
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
  },
  titleBox: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  title: {
    fontSize: 17,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
  },
  link: {
    fontSize: 13,
    fontWeight: '500',
    marginTop: 2,
  },
  route: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: BORDER_RADIUS,
  },
  routeTime: {
    fontSize: 18,
    fontWeight: '700',
  },
  routeDistance: {
    fontSize: 14,
    flex: 1,
  },
  routeClear: {
    alignSelf: 'center',
  },
  routeClearLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  action: {
    flex: 1,
  },
  iconButton: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
