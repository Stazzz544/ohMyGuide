import { ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { JSX } from 'react';
import { useTheme } from '@app/shared/theme';
import { GenerateForm } from '@app/features/generate-tour';
import { TourViewer } from '@app/widgets/tour-viewer';

export default function GenerateScreen(): JSX.Element {
  const { colors } = useTheme();

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <GenerateForm />
        <TourViewer />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 32,
  },
});
