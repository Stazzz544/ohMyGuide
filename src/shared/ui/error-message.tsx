import { View, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { BORDER_RADIUS } from '@app/shared/config';

type ErrorMessageProps = {
  message: string;
};

export const ErrorMessage = ({ message }: ErrorMessageProps): JSX.Element => {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: `${colors.danger}15` }]}>
      <Ionicons name="alert-circle-outline" size={20} color={colors.danger} />
      <Text style={[styles.text, { color: colors.danger }]}>{message}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: BORDER_RADIUS,
  },
  text: {
    fontSize: 14,
    flex: 1,
  },
});
