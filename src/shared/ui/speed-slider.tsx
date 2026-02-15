import { View, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Pressable } from 'react-native';
import { useTheme } from '@app/shared/theme';
import { MIN_SPEECH_RATE, MAX_SPEECH_RATE } from '@app/shared/config';

type SpeedSliderProps = {
  value: number;
  onValueChange: (value: number) => void;
};

const SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

export const SpeedSlider = ({ value, onValueChange }: SpeedSliderProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Скорость:</Text>
      <View style={styles.options}>
        {SPEED_OPTIONS.map((speed) => {
          const isActive = Math.abs(value - speed) < 0.01;
          return (
            <Pressable
              key={speed}
              onPress={() => onValueChange(speed)}
              style={[
                styles.option,
                {
                  backgroundColor: isActive ? colors.primary : colors.bgSecondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.optionText,
                  { color: isActive ? colors.textInverse : colors.textSecondary },
                ]}
              >
                {speed}x
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  options: {
    flexDirection: 'row',
    gap: 6,
    flex: 1,
    flexWrap: 'wrap',
  },
  option: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 13,
    fontWeight: '600',
  },
});
