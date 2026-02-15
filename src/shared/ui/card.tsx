import { View, StyleSheet, ViewStyle } from 'react-native';
import { JSX, ReactNode } from 'react';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS } from '@app/shared/config';

type CardProps = {
  children: ReactNode;
  style?: ViewStyle;
};

export const Card = ({ children, style }: CardProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.bgCard,
          borderColor: colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    padding: 16,
  },
});
