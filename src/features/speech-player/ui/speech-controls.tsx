import { View, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { Button, SpeedSlider } from '@app/shared/ui';
import { useTheme } from '@app/shared/theme';
import { speechModel } from '../model/speech-model';

type SpeechControlsProps = {
  text: string;
};

export const SpeechControls = ({ text }: SpeechControlsProps): JSX.Element => {
  const { colors } = useTheme();
  const { isSpeaking, speechRate, onPlay, onStop, onRateChange } = useUnit({
    isSpeaking: speechModel.$isSpeaking,
    speechRate: speechModel.$speechRate,
    onPlay: speechModel.playPressed,
    onStop: speechModel.stopPressed,
    onRateChange: speechModel.rateChanged,
  });

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
});
