import '@app/shared/lib/polyfills'; // ВАЖНО: ПЕРВЫМ!
import { Stack } from 'expo-router';
import { JSX, useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme } from '@app/shared/theme';
import { tourStore } from '@app/entities/tour';
import { folderStore } from '@app/entities/folder';
import { settingsModel } from '@app/features/ai-settings';

// Внутренний компонент для доступа к теме
const RootNavigation = (): JSX.Element => {
  const { isDark, colors } = useTheme();

  // Загрузка данных при старте приложения
  useEffect(() => {
    folderStore.foldersLoaded();
    tourStore.toursLoaded();
    settingsModel.settingsLoaded();
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.headerBg },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: colors.bgPrimary },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="tour/[id]" options={{ title: 'Экскурсия' }} />
      </Stack>
    </>
  );
};

export default function RootLayout(): JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <RootNavigation />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
