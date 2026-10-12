import { FlatList, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JSX, useCallback, useEffect, useRef } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { Button, ErrorMessage, Skeleton } from '@app/shared/ui';
import { NEARBY_RADIUS_OPTIONS_M } from '@app/shared/config';
import { formatRadius, pluralize } from '@app/shared/lib';
import { PLACE_KIND_LABELS, PlaceRow } from '@app/entities/place';
import { nearbyModel } from '@app/features/nearby-places';
import { explorerModel } from '../model/explorer-model';

import type { ListRenderItem } from 'react-native';
import type { Place, PlaceKind, PlaceSort } from '@app/entities/place';
import type { SearchMode } from '@app/features/nearby-places';

const PLACE_FORMS = { one: 'место', few: 'места', many: 'мест' };
const SKELETON_ROWS = 5;
const KINDS = Object.keys(PLACE_KIND_LABELS) as PlaceKind[];
const ATTRIBUTION =
  'Места: Wikidata и Википедия · фото: Wikimedia Commons · маршруты: OSRM · карта: OpenFreeMap, © OpenStreetMap';

const SORT_OPTIONS: Array<{ value: PlaceSort; label: string }> = [
  { value: 'distance', label: 'Ближе' },
  { value: 'fame', label: 'Известнее' },
];

type AreaState = {
  searchMode: SearchMode;
  isSightsLoading: boolean;
  sightsError: string | null;
  isCityLoading: boolean;
  cityError: string | null;
  isFreeLoading: boolean;
  isZoomTooFar: boolean;
  hasFailedTiles: boolean;
};

const getAreaStatus = (state: AreaState): string | null => {
  if (state.searchMode === 'city') {
    if (state.isCityLoading) {
      return 'Ищем места по всему городу. Первый поиск по большому городу занимает до минуты';
    }
    return state.cityError;
  }
  if (state.searchMode === 'free') {
    if (state.isZoomTooFar) {
      return 'Приблизьте карту, чтобы загрузить места в кадре';
    }
    if (state.isFreeLoading) {
      return 'Загружаем места в кадре';
    }
    return state.hasFailedTiles ? 'Wikidata ответила не по всему кадру — сдвиньте карту, чтобы повторить' : null;
  }
  if (state.isSightsLoading) {
    return 'Ищем известные места рядом. В новом районе первый поиск занимает до 30 секунд';
  }
  return state.sightsError ? 'Wikidata не ответила, показаны ближайшие статьи Википедии' : null;
};

const getTitle = (searchMode: SearchMode, count: number, radius: number, cityName: string | null): string => {
  const places = pluralize(count, PLACE_FORMS);
  if (searchMode === 'city') {
    return count > 0 && cityName ? `${places} · ${cityName}` : (cityName ?? 'Весь город');
  }
  if (searchMode === 'free') {
    return count > 0 ? `${places} в кадре` : 'Места на карте';
  }
  return count > 0 ? `${places} в радиусе ${formatRadius(radius)}` : 'Места рядом';
};

const getEmptyText = (searchMode: SearchMode, radius: number): string => {
  if (searchMode === 'city') {
    return 'В границах города не нашлось достопримечательностей со статьёй в Википедии';
  }
  if (searchMode === 'free') {
    return 'В этой части карты не нашлось достопримечательностей — сдвиньте карту или отдалите её';
  }
  return `В радиусе ${formatRadius(radius)} не нашлось достопримечательностей со статьёй в Википедии`;
};

type ChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const Chip = ({ label, isActive, onPress }: ChipProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: isActive }}
      style={[
        styles.chip,
        { borderColor: colors.border },
        isActive && { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
      ]}
    >
      <Text style={[styles.chipLabel, { color: isActive ? colors.bgPrimary : colors.textSecondary }]}>{label}</Text>
    </Pressable>
  );
};

export const NearbyList = (): JSX.Element => {
  const { colors } = useTheme();
  const {
    places,
    selectedId,
    sort,
    error,
    sightsError,
    isNearestLoading,
    isSightsLoading,
    placeSelected,
    sortChanged,
    retried,
    refreshed,
    isRefreshing,
    activeKind,
    kindCounts,
    kindChanged,
    radius,
    radiusChanged,
    searchMode,
    city,
    cityError,
    isCityLoading,
    isFreeLoading,
    isZoomTooFar,
    hasFailedTiles,
  } = useUnit({
    places: nearbyModel.$visiblePlaces,
    selectedId: nearbyModel.$selectedId,
    sort: nearbyModel.$sort,
    error: nearbyModel.$error,
    sightsError: nearbyModel.$sightsError,
    isNearestLoading: nearbyModel.$isNearestLoading,
    isSightsLoading: nearbyModel.$isSightsLoading,
    placeSelected: nearbyModel.placeSelected,
    sortChanged: nearbyModel.sortChanged,
    retried: nearbyModel.retried,
    refreshed: explorerModel.refreshed,
    isRefreshing: explorerModel.$isRefreshing,
    activeKind: nearbyModel.$kind,
    kindCounts: nearbyModel.$kindCounts,
    kindChanged: nearbyModel.kindChanged,
    radius: nearbyModel.$radius,
    radiusChanged: nearbyModel.radiusChanged,
    searchMode: nearbyModel.$searchMode,
    city: nearbyModel.$city,
    cityError: nearbyModel.$cityError,
    isCityLoading: nearbyModel.$isCityLoading,
    isFreeLoading: nearbyModel.$isFreeLoading,
    isZoomTooFar: nearbyModel.$isZoomTooFar,
    hasFailedTiles: nearbyModel.$hasFailedTiles,
  });
  const kinds = KINDS.filter((item) => (kindCounts[item] ?? 0) > 0);
  const listRef = useRef<FlatList<Place>>(null);

  useEffect(() => {
    const index = places.findIndex((place) => place.id === selectedId);
    if (index >= 0) {
      listRef.current?.scrollToIndex({ index, viewPosition: 0.3, animated: true });
    }
  }, [selectedId]);

  const renderItem: ListRenderItem<Place> = useCallback(
    ({ item }) => <PlaceRow place={item} isSelected={item.id === selectedId} onPress={placeSelected} />,
    [selectedId, placeSelected],
  );

  const handleScrollToIndexFailed = useCallback(
    ({ averageItemLength, index }: { averageItemLength: number; index: number }) => {
      listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
    },
    [],
  );

  const isRadiusMode = searchMode === 'radius';
  const nextRadius = isRadiusMode ? NEARBY_RADIUS_OPTIONS_M.find((option) => option > radius) : undefined;
  const title = getTitle(searchMode, places.length, radius, city?.name ?? null);
  const status = getAreaStatus({
    searchMode,
    isSightsLoading,
    sightsError,
    isCityLoading,
    cityError,
    isFreeLoading,
    isZoomTooFar,
    hasFailedTiles,
  });
  const blockingError = isRadiusMode ? error : null;
  const isLoading =
    (isRadiusMode && (isNearestLoading || isSightsLoading)) ||
    (searchMode === 'city' && isCityLoading) ||
    (searchMode === 'free' && isFreeLoading);
  const isEmpty = places.length === 0 && !blockingError && !isLoading && !(searchMode === 'free' && isZoomTooFar);
  const canRetryCity = searchMode === 'city' && cityError !== null && !isCityLoading;

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <View style={styles.chips}>
            {SORT_OPTIONS.map((option) => (
              <Chip
                key={option.value}
                label={option.label}
                isActive={sort === option.value}
                onPress={() => sortChanged(option.value)}
              />
            ))}
          </View>
        </View>
        {kinds.length > 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            <Chip label="Все" isActive={activeKind === 'all'} onPress={() => kindChanged('all')} />
            {kinds.map((item) => (
              <Chip
                key={item}
                label={`${PLACE_KIND_LABELS[item]} · ${kindCounts[item] ?? 0}`}
                isActive={activeKind === item}
                onPress={() => kindChanged(item)}
              />
            ))}
          </ScrollView>
        )}
        {status && <Text style={[styles.status, { color: colors.textSecondary }]}>{status}</Text>}
      </View>

      {blockingError && places.length === 0 && (
        <View style={styles.message}>
          <ErrorMessage message={blockingError} />
          <Button label="Повторить" variant="outline" onPress={retried} />
        </View>
      )}

      {!blockingError && places.length === 0 && isLoading && (
        <View style={styles.skeletons}>
          {Array.from({ length: SKELETON_ROWS }, (_, index) => (
            <View key={index} style={styles.skeletonRow}>
              <Skeleton width={52} height={52} />
              <View style={styles.skeletonText}>
                <Skeleton width="80%" height={14} />
                <Skeleton width="55%" height={12} />
              </View>
            </View>
          ))}
        </View>
      )}

      {isEmpty && (
        <View style={styles.message}>
          {!canRetryCity && (
            <Text style={[styles.empty, { color: colors.textSecondary }]}>{getEmptyText(searchMode, radius)}</Text>
          )}
          {canRetryCity && <Button label="Повторить" variant="outline" onPress={retried} />}
          {nextRadius && (
            <Button
              label={`Искать в радиусе ${formatRadius(nextRadius)}`}
              variant="outline"
              onPress={() => radiusChanged(nextRadius)}
            />
          )}
        </View>
      )}

      {places.length > 0 && (
        <FlatList
          ref={listRef}
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={selectedId}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          ListFooterComponent={<Text style={[styles.attribution, { color: colors.textSecondary }]}>{ATTRIBUTION}</Text>}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={refreshed}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    gap: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  titleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  status: {
    fontSize: 13,
  },
  message: {
    padding: 16,
    gap: 12,
  },
  skeletons: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 14,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  skeletonText: {
    flex: 1,
    gap: 8,
  },
  empty: {
    fontSize: 15,
  },
  attribution: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 11,
  },
});
