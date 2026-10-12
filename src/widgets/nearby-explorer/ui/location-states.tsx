import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { JSX } from 'react';
import { useUnit } from 'effector-react';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@app/shared/theme';
import { Button, ErrorMessage } from '@app/shared/ui';
import { locationModel } from '@app/features/user-location';

export const PermissionDenied = (): JSX.Element => {
  const { colors } = useTheme();
  const { canAskAgain, locationRequested, settingsOpened } = useUnit({
    canAskAgain: locationModel.$canAskAgain,
    locationRequested: locationModel.locationRequested,
    settingsOpened: locationModel.settingsOpened,
  });

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <Ionicons name="location-outline" size={40} color={colors.primary} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Нужен доступ к геолокации</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Координаты нужны только для поиска достопримечательностей рядом с вами.
      </Text>
      <View style={styles.actions}>
        {canAskAgain ? (
          <Button label="Разрешить доступ" onPress={locationRequested} />
        ) : (
          <Button label="Открыть настройки" onPress={settingsOpened} />
        )}
        {!canAskAgain && <Button label="Проверить снова" variant="ghost" onPress={locationRequested} />}
      </View>
    </View>
  );
};

type LocatingStateProps = {
  error: string | null;
};

export const LocatingState = ({ error }: LocatingStateProps): JSX.Element => {
  const { colors } = useTheme();
  const { locationRequested } = useUnit({ locationRequested: locationModel.locationRequested });

  if (error) {
    return (
      <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
        <ErrorMessage message={error} />
        <Button label="Повторить" variant="outline" onPress={locationRequested} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.bgSecondary }]}>
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={[styles.text, { color: colors.textSecondary }]}>Определяем ваше местоположение…</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  text: {
    fontSize: 15,
    textAlign: 'center',
    maxWidth: 320,
  },
  actions: {
    alignSelf: 'stretch',
    gap: 8,
    marginTop: 8,
  },
});
