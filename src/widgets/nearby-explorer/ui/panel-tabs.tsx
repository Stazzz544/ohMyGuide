import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { favoritesStore } from '@app/entities/favorite';
import { explorerModel } from '../model/explorer-model';

import type { PanelMode } from '../model/explorer-model';

export const PanelTabs = (): JSX.Element => {
  const { colors } = useTheme();
  const { panelMode, panelModeChanged, favorites } = useUnit({
    panelMode: explorerModel.$panelMode,
    panelModeChanged: explorerModel.panelModeChanged,
    favorites: favoritesStore.$favorites,
  });

  const tabs: Array<{ value: PanelMode; label: string; icon: 'navigate-outline' | 'star-outline' }> = [
    { value: 'nearby', label: 'Рядом', icon: 'navigate-outline' },
    {
      value: 'favorites',
      label: favorites.length > 0 ? `Избранное · ${favorites.length}` : 'Избранное',
      icon: 'star-outline',
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]} accessibilityRole="tablist">
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
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 4,
    marginHorizontal: 16,
    marginTop: 12,
    padding: 3,
    borderRadius: 999,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'transparent',
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    flexShrink: 1,
  },
});
