import { View, Text, Pressable, ActivityIndicator, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button, ErrorMessage } from '@app/shared/ui';
import { DEFAULT_GROQ_MODEL } from '@app/shared/api';
import { BORDER_RADIUS } from '@app/shared/config';
import { settingsModel } from '../model/settings-model';

export const ModelSelector = (): JSX.Element => {
  const { colors } = useTheme();
  const { model, models, error, isLoading, isConfigured, onModelSelect, onModelsRequest } =
    useUnit({
      model: settingsModel.$model,
      models: settingsModel.$models,
      error: settingsModel.$modelsError,
      isLoading: settingsModel.$isModelsLoading,
      isConfigured: settingsModel.$isConfigured,
      onModelSelect: settingsModel.modelSelected,
      onModelsRequest: settingsModel.modelsRequested,
    });

  const renderContent = (): JSX.Element => {
    if (!isConfigured) {
      return (
        <Text style={[styles.status, { color: colors.textSecondary }]}>
          Список моделей загрузится после ввода API-ключа. Сейчас выбрана: {model}
        </Text>
      );
    }

    if (error) {
      return (
        <View style={styles.list}>
          <ErrorMessage message={error} />
          <Button label="Повторить" variant="outline" onPress={onModelsRequest} loading={isLoading} />
        </View>
      );
    }

    if (models.length === 0) {
      return (
        <Text style={[styles.status, { color: colors.textSecondary }]}>
          {isLoading ? 'Загружаем список моделей…' : 'Groq не вернул доступных моделей'}
        </Text>
      );
    }

    return (
      <View style={styles.list}>
        {models.map((item) => {
          const isActive = item.id === model;
          const details = [item.ownedBy, item.id === DEFAULT_GROQ_MODEL ? 'рекомендуется' : '']
            .filter(Boolean)
            .join(' · ');

          return (
            <Pressable
              key={item.id}
              onPress={() => onModelSelect(item.id)}
              style={[
                styles.option,
                {
                  backgroundColor: isActive ? `${colors.primary}15` : colors.bgSecondary,
                  borderColor: isActive ? colors.primary : colors.border,
                },
              ]}
            >
              <Ionicons
                name={isActive ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={isActive ? colors.primary : colors.textSecondary}
              />
              <View style={styles.optionText}>
                <Text
                  style={[
                    styles.modelName,
                    { color: isActive ? colors.primary : colors.textPrimary },
                  ]}
                >
                  {item.id}
                </Text>
                {details ? (
                  <Text style={[styles.modelDetails, { color: colors.textSecondary }]}>
                    {details}
                  </Text>
                ) : null}
              </View>
            </Pressable>
          );
        })}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Модель</Text>
        {isConfigured ? (
          <Pressable
            onPress={() => onModelsRequest()}
            disabled={isLoading}
            hitSlop={12}
            accessibilityLabel="Обновить список моделей"
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Ionicons name="refresh" size={20} color={colors.primary} />
            )}
          </Pressable>
        ) : null}
      </View>
      {renderContent()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 24,
  },
  title: {
    fontSize: 14,
    fontWeight: '600',
  },
  status: {
    fontSize: 13,
    lineHeight: 18,
  },
  list: {
    gap: 8,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: BORDER_RADIUS,
    borderWidth: 1.5,
    padding: 14,
  },
  optionText: {
    flex: 1,
    gap: 2,
  },
  modelName: {
    fontSize: 15,
    fontWeight: '600',
  },
  modelDetails: {
    fontSize: 12,
  },
});
