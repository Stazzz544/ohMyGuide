import * as Speech from 'expo-speech';
import { SPEECH_LANGUAGE, DEFAULT_SPEECH_RATE } from '@app/shared/config';

export type SpeakOptions = {
  text: string;
  rate?: number;
  voice?: string;
  onStart?: () => void;
  onDone?: () => void;
  onError?: (error: Error) => void;
};

// Обёртка над expo-speech
export const speechService = {
  speak({ text, rate = DEFAULT_SPEECH_RATE, voice, onStart, onDone, onError }: SpeakOptions): void {
    Speech.speak(text, {
      language: SPEECH_LANGUAGE,
      rate,
      voice,
      onStart,
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

  async getRussianVoices(): Promise<Speech.Voice[]> {
    const voices = await Speech.getAvailableVoicesAsync();
    return voices.filter((voice) => voice.language.startsWith('ru') || voice.language === 'ru-RU');
  },
};
