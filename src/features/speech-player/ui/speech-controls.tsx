import { View, Text, Pressable, StyleSheet } from 'react-native';
import type { GestureResponderEvent, LayoutChangeEvent } from 'react-native';
import { JSX, useCallback, useEffect, useState } from 'react';
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
  const { isSpeaking, speechRate, progress, sentences, onPlay, onStop, onRateChange, onSeek } = useUnit({
    isSpeaking: speechModel.$isSpeaking,
    speechRate: speechModel.$speechRate,
    progress: speechModel.$progress,
    sentences: speechModel.$sentences,
    onPlay: speechModel.playPressed,
    onStop: speechModel.stopPressed,
    onRateChange: speechModel.rateChanged,
    onSeek: speechModel.seekToSentence,
  });

  const [progressBarWidth, setProgressBarWidth] = useState<number>(0);

  const handleProgressBarLayout = useCallback((event: LayoutChangeEvent) => {
    setProgressBarWidth(event.nativeEvent.layout.width);
  }, []);

  const handleProgressBarPress = useCallback(
    (event: GestureResponderEvent) => {
      if (sentences.length === 0 || progressBarWidth === 0) {
        return;
      }

      const { locationX } = event.nativeEvent;
      const percentage = Math.max(0, Math.min(1, locationX / progressBarWidth));
      const targetIndex = Math.min(
        Math.floor(percentage * sentences.length),
        sentences.length - 1,
      );

      onSeek(targetIndex);
    },
    [sentences, progressBarWidth, onSeek],
  );

  // Загрузить доступные голоса при монтировании компонента
  useEffect(() => {
    speechModel.loadVoicesFx();
  }, []);

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
          Прогресс: {progress}%
        </Text>
        <Pressable
          onPress={handleProgressBarPress}
          onLayout={handleProgressBarLayout}
          style={[styles.progressBar, { backgroundColor: colors.border }]}
        >
          <View
            style={[
              styles.progressFill,
              {
                backgroundColor: colors.primary,
                width: `${progress}%`,
              },
            ]}
          />
        </Pressable>
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
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
});
