import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { favoritesStore } from '@app/entities/favorite';
import { nearbyModel } from '@app/features/nearby-places';
import { explorerModel } from '../model/explorer-model';

import type { PanelMode } from '../model/explorer-model';

const withCount = (label: string, count: number): string => (count > 0 ? `${label} · ${count}` : label);

export const PanelTabs = (): JSX.Element => {
  const { colors } = useTheme();
  const { panelMode, panelModeChanged, favorites, places, isListExpanded, listExpandToggled } = useUnit({
    panelMode: explorerModel.$panelMode,
    panelModeChanged: explorerModel.panelModeChanged,
    favorites: favoritesStore.$favorites,
    places: nearbyModel.$places,
    isListExpanded: explorerModel.$isListExpanded,
    listExpandToggled: explorerModel.listExpandToggled,
  });

  const tabs: Array<{ value: PanelMode; label: string; icon: 'navigate-outline' | 'star-outline' }> = [
    { value: 'nearby', label: withCount('Рядом', places.length), icon: 'navigate-outline' },
    { value: 'favorites', label: withCount('Избранное', favorites.length), icon: 'star-outline' },
  ];

  return (
    <View style={styles.container}>
      <View style={[styles.tabs, { backgroundColor: colors.bgSecondary }]} accessibilityRole="tablist">
        {tabs.map((tab) => {
          const isActive = tab.value === panelMode;

          return (
            <Pressable
              key={tab.value}
              onPress={() => panelModeChanged(tab.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              style={[styles.tab, isActive && { backgroundColor: colors.bgCard, borderColor: colors.border }]}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? colors.primary : colors.textSecondary} />
              <Text
                style={[styles.label, { color: isActive ? colors.textPrimary : colors.textSecondary }]}
                numberOfLines={1}
              >
                {tab.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Pressable
        onPress={listExpandToggled}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={isListExpanded ? 'Свернуть список' : 'Развернуть список'}
        style={[styles.expand, { backgroundColor: colors.bgSecondary }]}
      >
        <Ionicons name={isListExpanded ? 'chevron-down' : 'chevron-up'} size={20} color={colors.textPrimary} />
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 16,
    marginTop: 8,
  },
  tabs: {
    flex: 1,
    flexDirection: 'row',
    gap: 4,
    padding: 3,
    borderRadius: 999,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
  expand: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
  },
});
