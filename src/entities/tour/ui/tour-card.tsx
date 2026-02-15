import { View, Text, Pressable, StyleSheet } from 'react-native';
import { JSX, useCallback } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS } from '@app/shared/config';

import type { Tour } from '../model/types';

type TourCardProps = {
  tour: Tour;
  onPress: (id: string) => void;
  onDelete: (id: string) => void;
};

export const TourCard = ({ tour, onPress, onDelete }: TourCardProps): JSX.Element => {
  const { colors } = useTheme();

  const handlePress = useCallback((): void => {
    onPress(tour.id);
  }, [tour.id, onPress]);

  const handleDelete = useCallback((): void => {
    onDelete(tour.id);
  }, [tour.id, onDelete]);

  const preview = tour.generatedText.substring(0, 120);
  const dateStr = new Date(tour.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="location-outline" size={18} color={colors.primary} />
          <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
            {tour.placeName}
          </Text>
        </View>
        <Pressable onPress={handleDelete} hitSlop={8} style={styles.deleteButton}>
          <Ionicons name="trash-outline" size={20} color={colors.danger} />
        </Pressable>
      </View>
      <Text style={[styles.preview, { color: colors.textSecondary }]} numberOfLines={2}>
        {preview}...
      </Text>
      <Text style={[styles.date, { color: colors.textSecondary }]}>{dateStr}</Text>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    padding: 16,
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  deleteButton: {
    padding: 4,
  },
  preview: {
    fontSize: 14,
    lineHeight: 20,
  },
  date: {
    fontSize: 12,
  },
});
