import { View, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useTheme } from '@app/shared/theme';
import { SavedToursList } from '@app/widgets/saved-tours-list';

export default function SavedScreen(): JSX.Element {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <SavedToursList />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
