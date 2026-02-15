import { Pressable, Text, ActivityIndicator, StyleSheet, ViewStyle } from 'react-native';
import { JSX, useCallback } from 'react';
import { useTheme } from '@app/shared/theme';
import { BORDER_RADIUS } from '@app/shared/config';

export type ButtonVariant = 'fill' | 'outline' | 'ghost';
export type ButtonAppearance = 'primary' | 'danger' | 'success';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  appearance?: ButtonAppearance;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  icon?: JSX.Element;
};

export const Button = ({
  label,
  onPress,
  variant = 'fill',
  appearance = 'primary',
  disabled = false,
  loading = false,
  style,
  icon,
}: ButtonProps): JSX.Element => {
  const { colors } = useTheme();

  const isDisabled = disabled || loading;

  // Определяем цвет фона
  const getBackgroundColor = useCallback((): string => {
    if (variant !== 'fill') {
      return 'transparent';
    }
    if (appearance === 'danger') {
      return colors.danger;
    }
    if (appearance === 'success') {
      return colors.success;
    }
    return colors.primary;
  }, [variant, appearance, colors]);

  // Определяем цвет текста
  const getTextColor = useCallback((): string => {
    if (variant === 'fill') {
      return colors.textInverse;
    }
    if (appearance === 'danger') {
      return colors.danger;
    }
    if (appearance === 'success') {
      return colors.success;
    }
    return colors.primary;
  }, [variant, appearance, colors]);

  // Определяем цвет бордера
  const getBorderColor = useCallback((): string => {
    if (variant !== 'outline') {
      return 'transparent';
    }
    if (appearance === 'danger') {
      return colors.danger;
    }
    if (appearance === 'success') {
      return colors.success;
    }
    return colors.primary;
  }, [variant, appearance, colors]);

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: getBackgroundColor(),
          borderColor: getBorderColor(),
          opacity: isDisabled ? 0.5 : pressed ? 0.8 : 1,
        },
        variant === 'outline' && styles.outlined,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon}
          <Text style={[styles.label, { color: getTextColor() }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: BORDER_RADIUS,
    gap: 8,
    minHeight: 48,
  },
  outlined: {
    borderWidth: 1.5,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
});
