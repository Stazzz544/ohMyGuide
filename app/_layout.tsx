import { Stack } from "expo-router";
import { JSX } from "react";

export default function RootLayout(): JSX.Element {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="details" options={{ title: "Подробности" }} />
    </Stack>
  );
}
