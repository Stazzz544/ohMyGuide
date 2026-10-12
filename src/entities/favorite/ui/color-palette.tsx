import { Pressable, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { FAVORITE_PALETTE } from '../lib/favorite-place';

type ColorPaletteProps = {
  value: string | null;
  onChange: (color: string | null) => void;
  // Подпись для первого кружка: «По умолчанию» у группы, «Как у группы» у места
  defaultLabel: string;
  // Цвет, который получит метка при выборе первого кружка
  defaultColor: string;
};

const DOT_SIZE = 30;

export const ColorPalette = ({ value, onChange, defaultLabel, defaultColor }: ColorPaletteProps): JSX.Element => {
  const { colors } = useTheme();
  const options: Array<string | null> = [null, ...FAVORITE_PALETTE];

  return (
    <View style={styles.container}>
      <View style={styles.dots} accessibilityRole="radiogroup">
        {options.map((option) => {
          const isActive = option === value;

          return (
            <Pressable
              key={option ?? 'default'}
              onPress={() => onChange(option)}
              accessibilityRole="radio"
              accessibilityState={{ checked: isActive }}
              accessibilityLabel={option ?? defaultLabel}
              hitSlop={4}
              style={[
                styles.dot,
                {
                  backgroundColor: option ?? defaultColor,
                  borderColor: option ? colors.bgCard : colors.favoriteStroke,
                },
                isActive && { borderColor: colors.textPrimary },
              ]}
            >
              {isActive && <Ionicons name="checkmark" size={16} color={colors.textInverse} />}
            </Pressable>
          );
        })}
      </View>
      {value === null && <Text style={[styles.caption, { color: colors.textSecondary }]}>{defaultLabel}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 6,
  },
  dots: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  caption: {
    fontSize: 12,
  },
});
