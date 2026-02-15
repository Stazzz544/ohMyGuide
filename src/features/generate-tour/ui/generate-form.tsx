import { View, Text, StyleSheet } from 'react-native';
import { JSX, useMemo } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { Button, TextInput, ErrorMessage } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { settingsModel } from '@app/features/ai-settings';
import { generateModel } from '../model/generate-model';
import { saveModel } from '@app/features/save-tour';
import { createFolderPickerModel, FolderPickerModal } from '@app/features/folder-picker';

export const GenerateForm = (): JSX.Element => {
  const { colors } = useTheme();
  const folderPickerModel = useMemo(() => createFolderPickerModel(), []);

  const {
    placeName,
    isGenerating,
    canGenerate,
    error,
    isConfigured,
    generatedText,
    folderPickerVisible,
    onPlaceNameChange,
    onGenerate,
  } = useUnit({
    placeName: generateModel.$placeName,
    isGenerating: generateModel.$isGenerating,
    canGenerate: generateModel.$canGenerate,
    error: generateModel.$error,
    isConfigured: settingsModel.$isConfigured,
    generatedText: generateModel.$generatedText,
    folderPickerVisible: saveModel.$folderPickerVisible,
    onPlaceNameChange: generateModel.placeNameChanged,
    onGenerate: generateModel.generatePressed,
  });

  return (
    <>
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
            loading={isGenerating}
            icon={<Ionicons name="sparkles" size={18} color={colors.textInverse} />}
            style={styles.generateButton}
          />
          <Button
            label="Сохранить"
            onPress={() => {
              if (generatedText && placeName) {
                saveModel.saveTourPressed({ placeName, generatedText });
              }
            }}
            appearance="success"
            disabled={!generatedText || !placeName}
            icon={<Ionicons name="bookmark-outline" size={18} color="#ffffff" />}
            style={styles.saveButton}
          />
        </View>
      </View>

      <FolderPickerModal
        visible={folderPickerVisible}
        model={folderPickerModel}
        onClose={saveModel.folderPickerClosed}
        onSelect={saveModel.folderSelected}
      />
    </>
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
  saveButton: {
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
