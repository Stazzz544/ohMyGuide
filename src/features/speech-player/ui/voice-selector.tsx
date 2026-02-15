import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { JSX, useState } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { speechModel } from '../model/speech-model';

export const VoiceSelector = (): JSX.Element | null => {
  const { colors } = useTheme();
  const [isExpanded, setIsExpanded] = useState(false);

  const { voices, selectedVoice, onSelect } = useUnit({
    voices: speechModel.$availableVoices,
    selectedVoice: speechModel.$selectedVoice,
    onSelect: speechModel.voiceSelected,
  });

  if (voices.length === 0) {
    return null;
  }

  const currentVoice = voices.find((v) => v.identifier === selectedVoice) || voices[0];

  const handleSelect = (identifier: string) => {
    onSelect(identifier);
    setIsExpanded(false);
  };

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Голос:</Text>

      <TouchableOpacity
        style={[styles.selector, { backgroundColor: colors.inputBg, borderColor: colors.border }]}
        onPress={() => setIsExpanded(!isExpanded)}
      >
        <Text style={[styles.selectedText, { color: colors.textPrimary }]} numberOfLines={1}>
          {currentVoice.name}
        </Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textSecondary}
        />
      </TouchableOpacity>

      {isExpanded && (
        <ScrollView style={[styles.dropdown, { backgroundColor: colors.bgCard, borderColor: colors.border }]} nestedScrollEnabled={true}>
          {voices.map((voice) => {
            const isSelected = voice.identifier === selectedVoice;

            return (
              <TouchableOpacity
                key={voice.identifier}
                style={[
                  styles.option,
                  isSelected && { backgroundColor: colors.bgSecondary },
                ]}
                onPress={() => handleSelect(voice.identifier)}
              >
                <View style={styles.optionContent}>
                  <Text style={[styles.optionText, { color: colors.textPrimary }]} numberOfLines={1}>
                    {voice.name}
                  </Text>
                  <Text style={[styles.optionQuality, { color: colors.textSecondary }]} numberOfLines={1}>
                    {voice.quality}
                  </Text>
                </View>
                {isSelected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 8,
  },
  label: {
    fontSize: 14,
    marginBottom: 4,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  selectedText: {
    fontSize: 14,
    flex: 1,
    marginRight: 8,
  },
  dropdown: {
    marginTop: 4,
    maxHeight: 200,
    borderRadius: 8,
    borderWidth: 1,
    paddingVertical: 4,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  optionContent: {
    flex: 1,
    marginRight: 8,
  },
  optionText: {
    fontSize: 14,
    marginBottom: 2,
  },
  optionQuality: {
    fontSize: 12,
  },
});
