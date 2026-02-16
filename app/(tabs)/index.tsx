import { View, ScrollView, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { useTheme } from '@app/shared/theme';
import { GenerateForm, generateModel } from '@app/features/generate-tour';
import { TourViewer } from '@app/widgets/tour-viewer';

export default function GenerateScreen(): JSX.Element {
  const { colors } = useTheme();
  const { generatedText } = useUnit({
    generatedText: generateModel.$generatedText,
  });

  if (generatedText) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
        <View style={styles.fixedContent}>
          <GenerateForm />
        </View>
        <TourViewer />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
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
  fixedContent: {
    paddingTop: 16,
    paddingBottom: 8,
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 24,
    paddingBottom: 32,
  },
});
