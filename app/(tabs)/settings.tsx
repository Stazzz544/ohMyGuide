import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button } from '@app/shared/ui';
import { ProviderSelector } from '@app/features/ai-settings';
import { VoiceSelector } from '@app/features/speech-player';

export default function SettingsScreen(): JSX.Element {
  const { colors, isDark, toggleTheme } = useTheme();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.bgPrimary }]}
      contentContainerStyle={styles.content}
    >
      <ProviderSelector />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Настройки озвучки
        </Text>
        <VoiceSelector />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          Оформление
        </Text>
        <Button
          label={isDark ? 'Светлая тема' : 'Тёмная тема'}
          onPress={toggleTheme}
          variant="outline"
          icon={
            <Ionicons
              name={isDark ? 'sunny-outline' : 'moon-outline'}
              size={18}
              color={colors.primary}
            />
          }
        />
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          О приложении
        </Text>
        <Text style={[styles.aboutText, { color: colors.textSecondary }]}>
          OhMyGuide — AI-гид для самостоятельных туристов.{'\n'}
          Генерирует увлекательные экскурсии по любому месту и озвучивает их.
        </Text>
        <Text style={[styles.version, { color: colors.textSecondary }]}>
          Версия 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 28,
    paddingBottom: 32,
  },
  section: {
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  aboutText: {
    fontSize: 14,
    lineHeight: 22,
  },
  version: {
    fontSize: 12,
  },
});
