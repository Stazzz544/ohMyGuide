import { View, Text, Pressable, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { TextInput, Card } from '@app/shared/ui';
import { PROVIDER_LIST, AI_PROVIDERS } from '@app/shared/api';
import { BORDER_RADIUS } from '@app/shared/config';
import { settingsModel } from '../model/settings-model';

import type { AiProviderId } from '@app/shared/api';

export const ProviderSelector = (): JSX.Element => {
  const { colors } = useTheme();
  const { provider, apiKey, onProviderChange, onApiKeyChange } = useUnit({
    provider: settingsModel.$provider,
    apiKey: settingsModel.$apiKey,
    onProviderChange: settingsModel.providerChanged,
    onApiKeyChange: settingsModel.apiKeyChanged,
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
        AI-провайдер
      </Text>
      <View style={styles.providers}>
        {PROVIDER_LIST.map((item) => {
          const isActive = provider === item.id;
          return (
            <Pressable
              key={item.id}
              onPress={() => onProviderChange(item.id)}
              style={[
                styles.providerOption,
                {
                  backgroundColor: isActive ? `${colors.primary}15` : colors.bgSecondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <View style={styles.providerRow}>
                <Ionicons
                  name={isActive ? 'radio-button-on' : 'radio-button-off'}
                  size={20}
                  color={isActive ? colors.primary : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.providerName,
                    { color: isActive ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {item.name}
                </Text>
              </View>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.apiKeySection}>
        <TextInput
          value={apiKey}
          onChangeText={onApiKeyChange}
          label="API-ключ"
          placeholder="Введите ваш API-ключ..."
        />
        {AI_PROVIDERS[provider].apiKeyHint ? (
          <View style={[styles.hint, { backgroundColor: `${colors.primary}12` }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[styles.hintText, { color: colors.textSecondary }]}>
              {AI_PROVIDERS[provider].apiKeyHint}
            </Text>
          </View>
        ) : null}
        {!apiKey.trim() ? (
          <View style={[styles.warning, { backgroundColor: `${colors.warning}20` }]}>
            <Ionicons name="warning-outline" size={16} color={colors.warning} />
            <Text style={[styles.warningText, { color: colors.textSecondary }]}>
              Для генерации экскурсий необходим API-ключ выбранного провайдера
            </Text>
          </View>
        ) : null}
      </View>
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
  providers: {
    gap: 8,
  },
  providerOption: {
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    padding: 14,
  },
  providerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '600',
  },
  apiKeySection: {
    gap: 8,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 13,
    flex: 1,
    lineHeight: 18,
  },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  warningText: {
    fontSize: 13,
    flex: 1,
  },
});
