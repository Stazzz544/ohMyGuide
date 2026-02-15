import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { JSX, useMemo } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { TourSkeleton, Button } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { SpeechControls } from '@app/features/speech-player';
import { generateModel } from '@app/features/generate-tour';
import { saveModel } from '@app/features/save-tour';
import { shareModel } from '@app/features/share-tour';
import { createFolderPickerModel, FolderPickerModal } from '@app/features/folder-picker';

export const TourViewer = (): JSX.Element => {
  const { colors } = useTheme();
  const folderPickerModel = useMemo(() => createFolderPickerModel(), []);

  const { generatedText, placeName, isGenerating, isPrepareMode, folderPickerVisible } = useUnit({
    generatedText: generateModel.$generatedText,
    placeName: generateModel.$placeName,
    isGenerating: generateModel.$isGenerating,
    isPrepareMode: generateModel.$isPrepareMode,
    folderPickerVisible: saveModel.$folderPickerVisible,
  });

  // Skeleton при загрузке
  if (isGenerating) {
    return (
      <View style={[styles.skeletonContainer, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
        {isPrepareMode ? (
          <View style={styles.prepareHint}>
            <Ionicons name="download-outline" size={16} color={colors.info} />
            <Text style={[styles.prepareHintText, { color: colors.info }]}>
              Подготовка офлайн-экскурсии...
            </Text>
          </View>
        ) : null}
        <TourSkeleton />
      </View>
    );
  }

  // Пустое состояние
  if (!generatedText) {
    return (
      <View style={styles.empty}>
        <Ionicons name="compass-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          Ваш гид готов!
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Введите название места и нажмите «Сгенерировать»
        </Text>
      </View>
    );
  }

  // Сгенерированный тур
  return (
    <>
      <View style={styles.container}>
        <View style={[styles.textCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
          <ScrollView
            style={styles.textScroll}
            contentContainerStyle={styles.textContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={[styles.tourText, { color: colors.textPrimary }]}>
              {generatedText}
            </Text>
          </ScrollView>
        </View>

        <View style={styles.controlsSection}>
          <SpeechControls text={generatedText} />
        </View>

        <View style={styles.actions}>
          <Button
            label="Сохранить"
            onPress={() => saveModel.saveTourPressed({ placeName, generatedText })}
            appearance="success"
            icon={<Ionicons name="bookmark-outline" size={18} color="#ffffff" />}
            style={styles.actionButton}
          />
          <Button
            label="Поделиться"
            variant="outline"
            onPress={() => shareModel.sharePressed({ placeName, text: generatedText })}
            icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
            style={styles.actionButton}
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
    gap: 16,
    paddingHorizontal: 16,
  },
  skeletonContainer: {
    marginHorizontal: 16,
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  prepareHint: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  prepareHintText: {
    fontSize: 13,
    fontWeight: '500',
  },
  empty: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  textCard: {
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    maxHeight: 400,
    overflow: 'hidden',
  },
  textScroll: {
    maxHeight: 400,
  },
  textContent: {
    padding: 16,
  },
  tourText: {
    fontSize: 15,
    lineHeight: 24,
  },
  controlsSection: {
    gap: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  actionButton: {
    flex: 1,
  },
});
