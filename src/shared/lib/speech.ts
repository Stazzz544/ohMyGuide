import * as Speech from 'expo-speech';
import { SPEECH_LANGUAGE, DEFAULT_SPEECH_RATE } from '@app/shared/config';

export type SpeakOptions = {
  text: string;
  rate?: number;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

// Обёртка над expo-speech
export const speechService = {
  speak({ text, rate = DEFAULT_SPEECH_RATE, onDone, onError }: SpeakOptions): void {
    Speech.speak(text, {
      language: SPEECH_LANGUAGE,
      rate,
      onDone,
      onError: (error) => {
        onError?.(new Error(String(error)));
      },
    });
  },

  stop(): void {
    Speech.stop();
  },

  async isSpeaking(): Promise<boolean> {
    return Speech.isSpeakingAsync();
  },

  async getVoices(): Promise<Speech.Voice[]> {
    return Speech.getAvailableVoicesAsync();
  },
};
