import { View, ScrollView, Text, StyleSheet } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { JSX, useCallback, useEffect, useRef } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { TourSkeleton } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import type { ThemeColors } from '@app/shared/theme/colors';
import { CARD_BORDER_RADIUS } from '@app/shared/config';
import { SpeechControls, speechModel } from '@app/features/speech-player';
import { generateModel } from '@app/features/generate-tour';
import type { TextStructureV2 } from '@app/shared/lib';

type HighlightedTextProps = {
  structure: TextStructureV2;
  currentWordIndex: number;
  colors: ThemeColors;
  onWordPress: (globalWordIndex: number) => void;
};

const HighlightedText = ({ structure, currentWordIndex, colors, onWordPress }: HighlightedTextProps): JSX.Element => {
  const scrollViewRef = useRef<ScrollView>(null);
  const paragraphPositions = useRef<Record<number, number>>({});
  const isUserScrolling = useRef<boolean>(false);
  const scrollTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleParagraphLayout = useCallback((pIndex: number, event: LayoutChangeEvent) => {
    paragraphPositions.current[pIndex] = event.nativeEvent.layout.y;
  }, []);

  const handleScrollBeginDrag = useCallback(() => {
    isUserScrolling.current = true;
    if (scrollTimeout.current) {
      clearTimeout(scrollTimeout.current);
    }
  }, []);

  const handleScrollEndDrag = useCallback(() => {
    scrollTimeout.current = setTimeout(() => {
      isUserScrolling.current = false;
    }, 2000);
  }, []);

  useEffect(() => {
    if (isUserScrolling.current) {
      return;
    }

    const currentParagraph = structure.paragraphs.findIndex(
      (p) => currentWordIndex >= p.globalWordStart && currentWordIndex <= p.globalWordEnd,
    );

    if (currentParagraph >= 0 && scrollViewRef.current) {
      const y = paragraphPositions.current[currentParagraph] ?? 0;
      scrollViewRef.current.scrollTo({ y: Math.max(0, y - 20), animated: true });
    }
  }, [currentWordIndex, structure]);

  return (
    <ScrollView
      ref={scrollViewRef}
      contentContainerStyle={styles.textContent}
      showsVerticalScrollIndicator={true}
      nestedScrollEnabled={true}
      onScrollBeginDrag={handleScrollBeginDrag}
      onScrollEndDrag={handleScrollEndDrag}
    >
      {structure.paragraphs.map((paragraph, pIndex) => (
        <View
          key={pIndex}
          style={styles.paragraph}
          onLayout={(event) => handleParagraphLayout(pIndex, event)}
        >
          <Text style={styles.tourText}>
            {paragraph.sentences.map((sentence, sIndex) => (
              <Text key={`s-${paragraph.startIndex + sIndex}`}>
                {sentence.words.map((wordInfo, wIndex) => {
                  const isRead = wordInfo.globalIndex < currentWordIndex;
                  const isCurrent = wordInfo.globalIndex === currentWordIndex;

                  return (
                    <Text
                      key={wordInfo.globalIndex}
                      onPress={() => onWordPress(wordInfo.globalIndex)}
                      style={[
                        isRead && { color: colors.textSecondary, opacity: 0.6 },
                        isCurrent && {
                          color: colors.primary,
                          backgroundColor: colors.primary + '20',
                        },
                        !isRead && !isCurrent && { color: colors.textPrimary },
                      ]}
                    >
                      {wordInfo.word}{wIndex < sentence.words.length - 1 ? ' ' : ''}
                    </Text>
                  );
                })}
                {sIndex < paragraph.sentences.length - 1 ? ' ' : ''}
              </Text>
            ))}
          </Text>
        </View>
      ))}
    </ScrollView>
  );
};

export const TourViewer = (): JSX.Element => {
  const { colors } = useTheme();

  const { generatedText, placeName, isGenerating, isPrepareMode } = useUnit({
    generatedText: generateModel.$generatedText,
    placeName: generateModel.$placeName,
    isGenerating: generateModel.$isGenerating,
    isPrepareMode: generateModel.$isPrepareMode,
  });

  const { isSpeaking, textStructure, currentWordIndex, onSeekWord } = useUnit({
    isSpeaking: speechModel.$isSpeaking,
    textStructure: speechModel.$textStructure,
    currentWordIndex: speechModel.$currentWordIndex,
    onSeekWord: speechModel.seekToWord,
  });

  const handleWordPress = useCallback(
    (globalWordIndex: number) => {
      onSeekWord(globalWordIndex);
    },
    [onSeekWord],
  );

  // Skeleton при загрузке
  if (isGenerating) {
    return (
      <View
        style={[
          styles.skeletonContainer,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
      >
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
        <Ionicons
          name="compass-outline"
          size={48}
          color={colors.textSecondary}
        />
        <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>
          Ваш гид готов!
        </Text>
        <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
          Введите название места и нажмите «Сгенерировать».
        </Text>
      </View>
    );
  }

  // Сгенерированный тур
  return (
    <View style={styles.container}>
      <View style={styles.controlsSection}>
        <SpeechControls text={generatedText} placeName={placeName} />
      </View>

      <View
        style={[
          styles.textCard,
          { backgroundColor: colors.bgCard, borderColor: colors.border },
        ]}
      >
        {isSpeaking && textStructure ? (
          <HighlightedText
            structure={textStructure}
            currentWordIndex={currentWordIndex}
            colors={colors}
            onWordPress={handleWordPress}
          />
        ) : (
          <ScrollView
            contentContainerStyle={styles.textContent}
            showsVerticalScrollIndicator={true}
            nestedScrollEnabled={true}
          >
            <Text style={[styles.tourText, { color: colors.textPrimary }]}>
              {generatedText}
            </Text>
          </ScrollView>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
    flex: 1,
    borderRadius: CARD_BORDER_RADIUS,
    borderWidth: 1,
    overflow: 'hidden',
  },
  textContent: {
    padding: 16,
  },
  tourText: {
    fontSize: 15,
    lineHeight: 24,
  },
  paragraph: {
    marginBottom: 16,
  },
  controlsSection: {
    gap: 12,
  },
});
