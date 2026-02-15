import { StyleSheet, Text, View, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { JSX } from "react";

export default function DetailsScreen(): JSX.Element {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Экран подробностей</Text>
      <Text style={styles.description}>
        Этот экран открывается поверх табов через Stack-навигацию. Обрати
        внимание на кнопку "назад" в хедере — она появилась автоматически.
      </Text>

      <Pressable style={styles.button} onPress={() => router.back()}>
        <Text style={styles.buttonText}>Назад</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#040134",
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: "#545465",
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
  },
  button: {
    backgroundColor: "#ed6f78",
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
  },
});
