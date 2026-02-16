import { View, Text, PanResponder, StyleSheet } from 'react-native';
import type { LayoutChangeEvent, GestureResponderEvent, PanResponderGestureState } from 'react-native';
import { JSX, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { Button, SpeedSlider } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { speechModel } from '../model/speech-model';
import { shareModel } from '@app/features/share-tour';

type SpeechControlsProps = {
  text: string;
  placeName: string;
};

export const SpeechControls = ({ text, placeName }: SpeechControlsProps): JSX.Element => {
  const { colors } = useTheme();
  const { isSpeaking, speechRate, progress, textStructure, onPlay, onStop, onRateChange, onSeekWord } = useUnit({
    isSpeaking: speechModel.$isSpeaking,
    speechRate: speechModel.$speechRate,
    progress: speechModel.$progress,
    textStructure: speechModel.$textStructure,
    onPlay: speechModel.playPressed,
    onStop: speechModel.stopPressed,
    onRateChange: speechModel.rateChanged,
    onSeekWord: speechModel.seekToWord,
  });

  const barRef = useRef<View>(null);
  const barLayout = useRef<{ x: number; width: number }>({ x: 0, width: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragProgress, setDragProgress] = useState<number>(0);

  const handleProgressBarLayout = useCallback((event: LayoutChangeEvent) => {
    barLayout.current.width = event.nativeEvent.layout.width;
    // Измеряем абсолютную позицию бара на экране
    barRef.current?.measure((_x, _y, _w, _h, pageX) => {
      barLayout.current.x = pageX;
    });
  }, []);

  const pageXToPercent = useCallback((pageX: number): number => {
    const { x, width } = barLayout.current;
    if (width === 0) {
      return 0;
    }
    const localX = pageX - x;
    return Math.max(0, Math.min(100, (localX / width) * 100));
  }, []);

  const pageXToWordIndex = useCallback(
    (pageX: number): number => {
      const totalWordCount = textStructure?.totalWordCount ?? 0;
      const { x, width } = barLayout.current;
      if (totalWordCount === 0 || width === 0) {
        return 0;
      }
      const localX = pageX - x;
      const percentage = Math.max(0, Math.min(1, localX / width));
      return Math.min(Math.floor(percentage * totalWordCount), totalWordCount - 1);
    },
    [textStructure],
  );

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (event: GestureResponderEvent) => {
          // Перемеряем позицию бара при касании (мог проскроллиться)
          barRef.current?.measure((_x, _y, _w, _h, pageX) => {
            barLayout.current.x = pageX;
          });
          setIsDragging(true);
          setDragProgress(pageXToPercent(event.nativeEvent.pageX));
        },
        onPanResponderMove: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          setDragProgress(pageXToPercent(gestureState.moveX));
        },
        onPanResponderRelease: (_event: GestureResponderEvent, gestureState: PanResponderGestureState) => {
          const targetWordIndex = pageXToWordIndex(gestureState.moveX);
          setIsDragging(false);
          onSeekWord(targetWordIndex);
        },
        onPanResponderTerminate: () => {
          setIsDragging(false);
        },
      }),
    [pageXToPercent, pageXToWordIndex, onSeekWord],
  );

  // Загрузить доступные голоса при монтировании компонента
  useEffect(() => {
    speechModel.loadVoicesFx();
  }, []);

  const displayProgress = isDragging ? dragProgress : progress;

  return (
    <View style={styles.container}>
      <View style={styles.buttons}>
        {isSpeaking ? (
          <Button
            label="Стоп"
            onPress={onStop}
            appearance="danger"
            icon={<Ionicons name="stop" size={18} color={colors.textInverse} />}
            style={styles.speechButton}
          />
        ) : (
          <Button
            label="Прослушать"
            onPress={() => onPlay(text)}
            icon={<Ionicons name="play" size={18} color={colors.textInverse} />}
            style={styles.speechButton}
          />
        )}

        <Button
          label="Поделиться"
          variant="outline"
          onPress={() => shareModel.sharePressed({ placeName, text })}
          icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
          style={styles.shareButton}
          disabled={!placeName}
        />
      </View>

      <View style={styles.progressContainer}>
        <Text style={[styles.progressText, { color: colors.textSecondary }]}>
          Прогресс: {Math.round(displayProgress)}%
        </Text>
        <View
          ref={barRef}
          onLayout={handleProgressBarLayout}
          style={[styles.progressBar, { backgroundColor: colors.border }]}
          {...panResponder.panHandlers}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${displayProgress}%`,
              },
            ]}
          />
          <View
            style={[
              styles.progressThumb,
              {
                backgroundColor: colors.primary,
                left: `${displayProgress}%`,
              },
            ]}
          />
        </View>
      </View>

      <SpeedSlider value={speechRate} onValueChange={onRateChange} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  buttons: {
    flexDirection: 'row',
    gap: 8,
  },
  speechButton: {
    flex: 1,
  },
  shareButton: {
    flex: 1,
  },
  progressContainer: {
    marginVertical: 4,
  },
  progressText: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressBar: {
    height: 24,
    borderRadius: 4,
    justifyContent: 'center',
    overflow: 'visible',
  },
  progressFill: {
    height: 8,
    borderRadius: 4,
    position: 'absolute',
    left: 0,
    top: 8,
  },
  progressThumb: {
    width: 16,
    height: 16,
    borderRadius: 8,
    position: 'absolute',
    top: 4,
    marginLeft: -8,
  },
});
