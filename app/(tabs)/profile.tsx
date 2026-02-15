import { StyleSheet, Text, View, Image, Pressable, Alert } from 'react-native';

export default function ProfileScreen(): JSX.Element {
  const handlePress = (): void => {
    Alert.alert('Нажато!', 'Ты нажал на кнопку. Alert — это нативный диалог.');
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>JD</Text>
      </View>

      <Text style={styles.name}>John Doe</Text>
      <Text style={styles.email}>john@example.com</Text>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>12</Text>
          <Text style={styles.statLabel}>Проекты</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>48</Text>
          <Text style={styles.statLabel}>Задачи</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statValue}>3.2k</Text>
          <Text style={styles.statLabel}>Баллы</Text>
        </View>
      </View>

      <Pressable style={styles.button} onPress={handlePress}>
        <Text style={styles.buttonText}>Показать Alert</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    paddingTop: 48,
    padding: 24,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3748c6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarText: {
    color: '#ffffff',
    fontSize: 28,
    fontWeight: '700',
  },
  name: {
    fontSize: 22,
    fontWeight: '700',
    color: '#040134',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#545465',
    marginBottom: 32,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 32,
    marginBottom: 32,
  },
  stat: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#040134',
  },
  statLabel: {
    fontSize: 12,
    color: '#545465',
    marginTop: 4,
  },
  button: {
    backgroundColor: '#3748c6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 8,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
