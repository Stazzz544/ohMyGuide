import { View, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { TextInput } from '@app/shared/ui';
import { settingsModel } from '../model/settings-model';
import { ModelSelector } from './model-selector';

export const AiSettingsForm = (): JSX.Element => {
  const { colors } = useTheme();
  const { apiKey, onApiKeyChange } = useUnit({
    apiKey: settingsModel.$apiKey,
    onApiKeyChange: settingsModel.apiKeyChanged,
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Нейросеть Groq</Text>

      <View style={styles.apiKeySection}>
        <TextInput
          value={apiKey}
          onChangeText={onApiKeyChange}
          label="API-ключ"
          placeholder="Введите ваш API-ключ..."
        />
        <View style={[styles.notice, { backgroundColor: `${colors.primary}12` }]}>
          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
          <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
            Бесплатный ключ — на console.groq.com/keys. На бесплатном тарифе Groq все модели
            бесплатны в пределах лимитов
          </Text>
        </View>
        {!apiKey.trim() ? (
          <View style={[styles.notice, { backgroundColor: `${colors.warning}20` }]}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.noticeText, { color: colors.textSecondary }]}>
              Для генерации экскурсий необходим API-ключ Groq
            </Text>
          </View>
        ) : null}
      </View>

      <ModelSelector />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  apiKeySection: {
    gap: 8,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  noticeText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
});
