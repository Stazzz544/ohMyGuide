import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { APP_USER_AGENT } from '@app/shared/api';
import { BORDER_RADIUS } from '@app/shared/config';
import { estimateWalkMinutes, formatDistance } from '@app/shared/lib';

import type { Place } from '../model/types';

type PlaceRowProps = {
  place: Place;
  isSelected: boolean;
  onPress: (placeId: string) => void;
};

const THUMBNAIL_SIZE = 52;
const MAX_WALK_ESTIMATE_M = 10000;

export const PlaceRow = ({ place, isSelected, onPress }: PlaceRowProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={() => onPress(place.id)}
      accessibilityRole="button"
      accessibilityState={{ selected: isSelected }}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: colors.border },
        isSelected && { backgroundColor: `${colors.primary}1f` },
        pressed && !isSelected && { backgroundColor: colors.bgSecondary },
      ]}
    >
      {place.thumbnail ? (
        <Image
          source={{ uri: place.thumbnail, headers: { 'User-Agent': APP_USER_AGENT } }}
          style={[styles.thumbnail, { backgroundColor: colors.skeleton }]}
        />
      ) : (
        <View style={[styles.thumbnail, styles.placeholder, { backgroundColor: colors.bgSecondary }]}>
          <Ionicons name="location-outline" size={22} color={colors.textSecondary} />
        </View>
      )}
      <View style={styles.info}>
        <Text style={[styles.label, { color: colors.textPrimary }]} numberOfLines={2}>
          {place.label}
        </Text>
        {place.description ? (
          <Text style={[styles.description, { color: colors.textSecondary }]} numberOfLines={1}>
            {place.description}
          </Text>
        ) : null}
      </View>
      <View style={styles.distance}>
        <Text style={[styles.distanceValue, { color: colors.textPrimary }]}>{formatDistance(place.distanceM)}</Text>
        {place.distanceM <= MAX_WALK_ESTIMATE_M && (
          <Text style={[styles.walk, { color: colors.textSecondary }]}>
            {`≈ ${estimateWalkMinutes(place.distanceM)} мин`}
          </Text>
        )}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: {
    width: THUMBNAIL_SIZE,
    height: THUMBNAIL_SIZE,
    borderRadius: BORDER_RADIUS,
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
  },
  description: {
    fontSize: 13,
  },
  distance: {
    alignItems: 'flex-end',
  },
  distanceValue: {
    fontSize: 14,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  walk: {
    fontSize: 12,
  },
});
