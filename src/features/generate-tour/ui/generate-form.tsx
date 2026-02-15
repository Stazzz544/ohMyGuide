import { View, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextInput, ErrorMessage } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { settingsModel } from '@app/features/ai-settings';
import { generateModel } from '../model/generate-model';

export const GenerateForm = (): JSX.Element => {
  const { colors } = useTheme();

  const {
    placeName,
    isGenerating,
    canGenerate,
    error,
    isConfigured,
    isPrepareMode,
    onPlaceNameChange,
    onGenerate,
    onPrepare,
  } = useUnit({
    placeName: generateModel.$placeName,
    isGenerating: generateModel.$isGenerating,
    canGenerate: generateModel.$canGenerate,
    error: generateModel.$error,
    isConfigured: settingsModel.$isConfigured,
    isPrepareMode: generateModel.$isPrepareMode,
    onPlaceNameChange: generateModel.placeNameChanged,
    onGenerate: generateModel.generatePressed,
    onPrepare: generateModel.prepareOfflinePressed,
  });

  return (
    <View style={styles.container}>
      <TextInput
        value={placeName}
        onChangeText={onPlaceNameChange}
        placeholder="Красная площадь, Москва..."
        label="Куда идём?"
      />

      {!isConfigured ? (
        <View style={[styles.hint, { backgroundColor: `${colors.info}10` }]}>
          <Ionicons name="information-circle-outline" size={18} color={colors.info} />
          <Text style={[styles.hintText, { color: colors.textSecondary }]}>
            Укажите API-ключ в настройках для генерации экскурсий
          </Text>
        </View>
      ) : null}

      {error ? <ErrorMessage message={error} /> : null}

      <View style={styles.buttons}>
        <Button
          label="Сгенерировать"
          onPress={onGenerate}
          disabled={!canGenerate}
          loading={isGenerating && !isPrepareMode}
          icon={<Ionicons name="sparkles" size={18} color={colors.textInverse} />}
          style={styles.generateButton}
        />
        <Button
          label="Подготовить"
          onPress={onPrepare}
          variant="outline"
          disabled={!canGenerate}
          loading={isGenerating && isPrepareMode}
          icon={<Ionicons name="download-outline" size={18} color={colors.primary} />}
          style={styles.prepareButton}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
    paddingHorizontal: 16,
  },
  buttons: {
    flexDirection: 'row',
    gap: 10,
  },
  generateButton: {
    flex: 1,
  },
  prepareButton: {
    flex: 1,
  },
  hint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 8,
  },
  hintText: {
    fontSize: 13,
    flex: 1,
  },
});
