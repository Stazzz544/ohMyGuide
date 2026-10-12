import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { NEARBY_RADIUS_OPTIONS_M } from '@app/shared/config';
import { formatRadius } from '@app/shared/lib';
import { nearbyModel } from '@app/features/nearby-places';

export const RadiusSwitch = (): JSX.Element => {
  const { colors } = useTheme();
  const { radius, radiusChanged } = useUnit({
    radius: nearbyModel.$radius,
    radiusChanged: nearbyModel.radiusChanged,
  });

  return (
    <View
      style={[styles.container, { backgroundColor: colors.bgCard, borderColor: colors.border }]}
      accessibilityRole="radiogroup"
      accessibilityLabel="Радиус поиска"
    >
      {NEARBY_RADIUS_OPTIONS_M.map((option) => {
        const isActive = option === radius;

        return (
          <Pressable
            key={option}
            onPress={() => radiusChanged(option)}
            accessibilityRole="radio"
            accessibilityState={{ checked: isActive }}
            hitSlop={4}
            style={[styles.option, isActive && { backgroundColor: colors.primary }]}
          >
            <Text style={[styles.label, { color: isActive ? colors.textInverse : colors.textSecondary }]}>
              {formatRadius(option)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    left: 10,
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
