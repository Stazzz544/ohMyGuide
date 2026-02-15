import { View, Text, StyleSheet } from 'react-native';
import { JSX, useEffect } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { Button, SpeedSlider } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { speechModel } from '../model/speech-model';
import { VoiceSelector } from './voice-selector';

type SpeechControlsProps = {
  text: string;
};

export const SpeechControls = ({ text }: SpeechControlsProps): JSX.Element => {
  const { colors } = useTheme();
  const { isSpeaking, speechRate, progress, onPlay, onStop, onRateChange } = useUnit({
    isSpeaking: speechModel.$isSpeaking,
    speechRate: speechModel.$speechRate,
    progress: speechModel.$progress,
    onPlay: speechModel.playPressed,
    onStop: speechModel.stopPressed,
    onRateChange: speechModel.rateChanged,
  });

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
          />
        ) : (
          <Button
            label="Прослушать"
            onPress={() => onPlay(text)}
            icon={<Ionicons name="play" size={18} color={colors.textInverse} />}
          />
        )}
      </View>

      {isSpeaking && progress > 0 && (
        <View style={styles.progressContainer}>
          <Text style={[styles.progressText, { color: colors.textSecondary }]}>
            Прогресс: {progress}%
          </Text>
          <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
            <View
              style={[
                styles.progressFill,
                {
                  backgroundColor: colors.primary,
                  width: `${progress}%`,
                },
              ]}
            />
          </View>
        </View>
      )}

      <SpeedSlider value={speechRate} onValueChange={onRateChange} />

      <VoiceSelector />
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
  progressContainer: {
    marginVertical: 4,
  },
  progressText: {
    fontSize: 12,
    marginBottom: 6,
  },
  progressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
