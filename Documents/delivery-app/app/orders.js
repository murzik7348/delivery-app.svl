import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Colors from '../constants/Colors';

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 👇 Беремо РЕАЛЬНІ замовлення
  const orders = useSelector(state => state.orders.list);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Мої замовлення 🧾</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={item => item.id}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 100 }}>
             <Ionicons name="receipt-outline" size={60} color="gray" />
             <Text style={{ color: 'gray', marginTop: 10 }}>Історія порожня</Text>
             <TouchableOpacity style={styles.goShopBtn} onPress={() => router.push('/')}>
                <Text style={{color: 'white', fontWeight: 'bold'}}>Зробити замовлення</Text>
             </TouchableOpacity>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card }]}
            activeOpacity={0.8}
            onPress={() => router.push({
                pathname: '/order-details',
                params: { 
                    id: item.id, 
                    total: item.total,
                    date: item.date 
                }
            })}
          >
            <View style={styles.cardHeader}>
              <Text style={[styles.date, { color: theme.textSecondary }]}>{item.date}</Text>
              <View style={styles.statusBadge}>
                <Text style={styles.statusText}>{item.status}</Text>
              </View>
            </View>
            
            <Text style={[styles.storeName, { color: theme.text }]}>Замовлення #{item.id.slice(-4)}</Text>
            
            {/* Список товарів у замовленні */}
            <View style={styles.itemsList}>
                {item.items.map((prod, index) => (
                    <Text key={index} style={{color: theme.textSecondary, fontSize: 13}}>
                        • {prod.name} x{prod.quantity}
                    </Text>
                ))}
            </View>

            <View style={styles.divider} />
            
            <View style={styles.cardFooter}>
              <Text style={[styles.totalLabel, { color: theme.text }]}>Всього:</Text>
              <Text style={styles.totalPrice}>{item.total} грн</Text>
            </View>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: { borderRadius: 16, marginBottom: 16, padding: 16, elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  date: { fontSize: 12 },
  statusBadge: { backgroundColor: '#e334e3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  statusText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
  storeName: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  itemsList: { marginBottom: 10, paddingLeft: 5 },
  divider: { height: 1, backgroundColor: '#eee', marginVertical: 8 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  totalLabel: { fontSize: 16 },
  totalPrice: { fontSize: 18, fontWeight: 'bold', color: '#e334e3' },
  goShopBtn: { marginTop: 20, backgroundColor: '#e334e3', padding: 10, borderRadius: 10 }
});