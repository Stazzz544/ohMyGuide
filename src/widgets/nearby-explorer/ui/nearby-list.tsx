import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { JSX, useCallback, useEffect, useRef } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { Button, ErrorMessage, Skeleton } from '@app/shared/ui';
import { pluralize } from '@app/shared/lib';
import { PlaceRow } from '@app/entities/place';
import { nearbyModel } from '@app/features/nearby-places';
import { explorerModel } from '../model/explorer-model';

import type { ListRenderItem } from 'react-native';
import type { Place, PlaceSort } from '@app/entities/place';

const PLACE_FORMS = { one: 'место', few: 'места', many: 'мест' };
const SKELETON_ROWS = 5;

const SORT_OPTIONS: Array<{ value: PlaceSort; label: string }> = [
  { value: 'distance', label: 'Ближе' },
  { value: 'fame', label: 'Известнее' },
];

type SortChipProps = {
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const SortChip = ({ label, isActive, onPress }: SortChipProps): JSX.Element => {
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
  } = useUnit({
    places: nearbyModel.$places,
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
  });
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

  const handleScrollToIndexFailed = useCallback(({ averageItemLength, index }: { averageItemLength: number; index: number }) => {
    listRef.current?.scrollToOffset({ offset: averageItemLength * index, animated: true });
  }, []);

  const title = places.length > 0 ? `${pluralize(places.length, PLACE_FORMS)} в радиусе 5 км` : 'Места рядом';

  return (
    <View style={styles.container}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <View style={styles.chips}>
            {SORT_OPTIONS.map((option) => (
              <SortChip
                key={option.value}
                label={option.label}
                isActive={sort === option.value}
                onPress={() => sortChanged(option.value)}
              />
            ))}
          </View>
        </View>
        {isSightsLoading && (
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            Ищем известные места рядом. В новом районе первый поиск занимает до 20 секунд
          </Text>
        )}
        {!isSightsLoading && sightsError && (
          <Text style={[styles.status, { color: colors.textSecondary }]}>
            Wikidata не ответила, показаны ближайшие статьи Википедии
          </Text>
        )}
      </View>

      {error && places.length === 0 && (
        <View style={styles.message}>
          <ErrorMessage message={error} />
          <Button label="Повторить" variant="outline" onPress={retried} />
        </View>
      )}

      {!error && places.length === 0 && (isNearestLoading || isSightsLoading) && (
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

      {!error && places.length === 0 && !isNearestLoading && !isSightsLoading && (
        <Text style={[styles.empty, { color: colors.textSecondary }]}>
          В радиусе 5 км не нашлось достопримечательностей со статьёй в Википедии
        </Text>
      )}

      {places.length > 0 && (
        <FlatList
          ref={listRef}
          data={places}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          extraData={selectedId}
          onScrollToIndexFailed={handleScrollToIndexFailed}
          refreshControl={
            <RefreshControl
              refreshing={isNearestLoading}
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
    padding: 16,
    fontSize: 15,
  },
});
