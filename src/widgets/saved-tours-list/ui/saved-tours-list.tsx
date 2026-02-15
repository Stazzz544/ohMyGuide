import { FlatList, View, Text, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { JSX, useCallback, useEffect } from 'react';
import { useUnit } from 'effector-react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { tourStore, TourCard } from '@app/entities/tour';
import type { Tour, TourId } from '@app/entities/tour';

// Включаем LayoutAnimation для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export const SavedToursList = (): JSX.Element => {
  const { colors } = useTheme();
  const router = useRouter();
  const { tours, isLoading, onDelete, onRefresh } = useUnit({
    tours: tourStore.$tours,
    isLoading: tourStore.$isLoading,
    onDelete: tourStore.tourDeleted,
    onRefresh: tourStore.toursRefreshed,
  });

  const handlePress = useCallback((id: string): void => {
    router.push(`/tour/${id}` as const);
  }, [router]);

  const handleDelete = useCallback((id: TourId): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    onDelete(id);
  }, [onDelete]);

  const renderItem = useCallback(
    ({ item }: { item: Tour }): JSX.Element => (
      <TourCard tour={item} onPress={handlePress} onDelete={handleDelete} />
    ),
    [handlePress, handleDelete],
  );

  const keyExtractor = useCallback((item: Tour): string => item.id, []);

  // Пустое состояние
  if (tours.length === 0 && !isLoading) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bookmark-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          Нет сохранённых экскурсий
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Сгенерируйте экскурсию и сохраните её для офлайн-доступа
        </Text>
      </View>
    );
  }

  return (
    <FlatList
      data={tours}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      contentContainerStyle={styles.list}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      refreshing={isLoading}
      onRefresh={onRefresh}
      showsVerticalScrollIndicator={false}
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
  },
  separator: {
    height: 12,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
