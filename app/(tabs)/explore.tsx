import { StyleSheet, Text, View, FlatList, Pressable } from "react-native";
import { JSX, useState } from "react";

type Item = {
  id: string;
  title: string;
  description: string;
};

const DATA: Item[] = [
  {
    id: "1",
    title: "React Native",
    description: "Фреймворк для мобильных приложений",
  },
  {
    id: "2",
    title: "Expo",
    description: "Платформа для разработки на React Native",
  },
  {
    id: "3",
    title: "Expo Router",
    description: "Файловая навигация, как в Next.js",
  },
  { id: "4", title: "TypeScript", description: "Типизация для JavaScript" },
  { id: "5", title: "StyleSheet", description: "Стилизация компонентов в RN" },
];

export default function ExploreScreen(): JSX.Element {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const renderItem = ({ item }: { item: Item }): JSX.Element => {
    const isSelected = item.id === selectedId;

    return (
      <Pressable
        style={[styles.card, isSelected && styles.cardSelected]}
        onPress={() => setSelectedId(item.id)}
      >
        <Text style={styles.cardTitle}>{item.title}</Text>
        <Text style={styles.cardDescription}>{item.description}</Text>
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Технологии</Text>
      <FlatList
        data={DATA}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f4f4f7",
  },
  header: {
    fontSize: 22,
    fontWeight: "700",
    color: "#040134",
    padding: 24,
    paddingBottom: 12,
  },
  list: {
    padding: 24,
    paddingTop: 0,
    gap: 12,
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  cardSelected: {
    borderColor: "#3748c6",
    backgroundColor: "#f0f0f7",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#040134",
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 14,
    color: "#545465",
  },
});
