import { Share } from 'react-native';

export type ShareTourParams = {
  placeName: string;
  text: string;
};

export const shareTour = async ({ placeName, text }: ShareTourParams): Promise<void> => {
  const preview = text.substring(0, 300);
  await Share.share({
    title: `Экскурсия: ${placeName}`,
    message: `${placeName}\n\n${preview}...\n\nСоздано в OhMyGuide`,
  });
};
