import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { NEARBY_RADIUS_OPTIONS_M } from '@app/shared/config';
import { formatRadius } from '@app/shared/lib';
import { nearbyModel } from '@app/features/nearby-places';

import type { SearchMode } from '@app/features/nearby-places';

type SwitchOption = {
  key: string;
  label: string;
  isActive: boolean;
  onPress: () => void;
};

const AREA_OPTIONS: Array<{ searchMode: Exclude<SearchMode, 'radius'>; label: string }> = [
  { searchMode: 'city', label: 'Город' },
  { searchMode: 'free', label: 'Свободно' },
];

export const RadiusSwitch = (): JSX.Element => {
  const { colors } = useTheme();
  const { radius, searchMode, city, radiusChanged, searchModeChanged } = useUnit({
    radius: nearbyModel.$radius,
    searchMode: nearbyModel.$searchMode,
    city: nearbyModel.$city,
    radiusChanged: nearbyModel.radiusChanged,
    searchModeChanged: nearbyModel.searchModeChanged,
  });

  const options: SwitchOption[] = [
    ...NEARBY_RADIUS_OPTIONS_M.map((option) => ({
      key: String(option),
      label: formatRadius(option),
      isActive: searchMode === 'radius' && option === radius,
      onPress: () => radiusChanged(option),
    })),
    ...AREA_OPTIONS.map((option) => ({
      key: option.searchMode,
      label: option.searchMode === 'city' && searchMode === 'city' && city ? city.name : option.label,
      isActive: searchMode === option.searchMode,
      onPress: () => searchModeChanged(option.searchMode),
    })),
  ];

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={styles.scroll}
      contentContainerStyle={styles.scrollContent}
    >
      <View
        style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
        accessibilityRole="radiogroup"
        accessibilityLabel="Где искать"
      >
        {options.map((option) => (
          <Pressable
            key={option.key}
            onPress={option.onPress}
            accessibilityRole="radio"
            accessibilityState={{ checked: option.isActive }}
            hitSlop={4}
            style={[styles.option, option.isActive && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.label, { color: option.isActive ? colors.textInverse : colors.textSecondary }]}>
              {option.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scroll: {
    position: 'absolute',
    top: 10,
    left: 0,
    right: 0,
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 10,
  },
  container: {
    flexDirection: 'row',
    padding: 3,
    gap: 2,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  option: {
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 999,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
  },
});
