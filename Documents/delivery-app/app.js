import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Dima Delivery 🍕</Text>
      </View>

      <ScrollView style={styles.content}>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Твоє замовлення</Text>
          <Text style={styles.cardStatus}>Статус: Готується...</Text>
          <View style={styles.progressBar}></View>
        </View>

        <TouchableOpacity style={styles.button} onPress={() => alert('Скоро буде!')}>
          <Text style={styles.buttonText}>Оновити статус</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { padding: 50, backgroundColor: '#ff6600', alignItems: 'center' },
  headerTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  content: { padding: 20 },
  card: { backgroundColor: '#fff', padding: 20, borderRadius: 15, marginBottom: 20, elevation: 3 },
  cardTitle: { fontSize: 18, fontWeight: 'bold' },
  cardStatus: { color: '#666', marginTop: 10 },
  progressBar: { height: 10, backgroundColor: '#ff6600', width: '40%', marginTop: 15, borderRadius: 5 },
  button: { backgroundColor: '#333', padding: 15, borderRadius: 10, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' }
});