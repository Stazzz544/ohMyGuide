import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { JSX } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useStoreMap } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { tourStore } from '@app/entities/tour';
import { SpeechControls } from '@app/features/speech-player';
import { shareModel } from '@app/features/share-tour';
import { ExportButton } from '@app/features/export-tour';
import { Button } from '@app/shared/ui';

export default function TourDetailScreen(): JSX.Element {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors } = useTheme();

  const tour = useStoreMap({
    store: tourStore.$tours,
    keys: [id],
    fn: (tours, [tourId]) => tours.find((t) => t.id === tourId) ?? null,
  });

  if (!tour) {
    return (
      <View style={styles.center}>
        <Ionicons name="alert-circle-outline" size={48} color={colors.textSecondary} />
        <Text style={[styles.notFoundText, { color: colors.textSecondary }]}>
          Экскурсия не найдена
        </Text>
      </View>
    );
  }

  const dateStr = new Date(tour.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bgPrimary }]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Ionicons name="location" size={22} color={colors.primary} />
            <Text style={[styles.title, { color: colors.textPrimary }]}>
              {tour.placeName}
            </Text>
          </View>
          <Text style={[styles.date, { color: colors.textSecondary }]}>{dateStr}</Text>
        </View>

        <Text style={[styles.text, { color: colors.textPrimary }]}>
          {tour.generatedText}
        </Text>
      </ScrollView>

      <View style={[styles.controls, { backgroundColor: colors.bgPrimary, borderTopColor: colors.border }]}>
        <SpeechControls text={tour.generatedText} placeName={tour.placeName} />
        <View style={styles.buttonsRow}>
          <Button
            label="Поделиться"
            variant="outline"
            onPress={() => shareModel.sharePressed({ placeName: tour.placeName, text: tour.generatedText })}
            icon={<Ionicons name="share-outline" size={18} color={colors.primary} />}
            style={{ flex: 1 }}
          />
          <ExportButton
            tourParams={{
              placeName: tour.placeName,
              generatedText: tour.generatedText,
              createdAt: tour.createdAt,
            }}
            format="txt"
            label="Экспорт"
            variant="outline"
            style={{ flex: 1 }}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  notFoundText: {
    fontSize: 16,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 8,
  },
  header: {
    gap: 4,
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    flex: 1,
  },
  date: {
    fontSize: 13,
    marginLeft: 30,
  },
  text: {
    fontSize: 15,
    lineHeight: 24,
  },
  controls: {
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
  },
  buttonsRow: {
    flexDirection: 'row',
    gap: 12,
  },
});
