import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';

export default function OrdersScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const orders = useSelector((state) => state.orders.orders);
  const locale = useSelector(s => s.language?.locale ?? 'uk');

  const renderOrderItem = ({ item }) => (
    <TouchableOpacity
      activeOpacity={0.8}
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => router.push({ pathname: '/order-details', params: { id: item.id } })}
    >
      <View style={styles.cardHeader}>
        <View style={styles.row}>
          <View style={[styles.iconBox, { backgroundColor: theme.input }]}>
            <Ionicons name="receipt" size={20} color="#e334e3" />
          </View>
          <View style={{ marginLeft: 10 }}>
            <Text style={[styles.orderTitle, { color: theme.text }]}>{t(locale, 'orderHash')}{item.id.slice(-4)}</Text>
            <Text style={styles.date}>{new Date(item.date).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA')}</Text>
          </View>
        </View>
        <Text style={[styles.price, { color: theme.text }]}>{item.total} ₴</Text>
      </View>

      <View style={styles.divider} />

      <View style={styles.cardFooter}>
        <StatusBadge status={item.status} locale={locale} />
        <View style={styles.detailsBtn}>
          <Text style={styles.detailsText}>{t(locale, 'details')}</Text>
          <Ionicons name="chevron-forward" size={16} color="#e334e3" />
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t(locale, 'ordersTitle')}</Text>
        <View style={{ width: 28 }} />
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t(locale, 'emptyHistory')}</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/(tabs)')}>
              <Text style={styles.shopBtnText}>{t(locale, 'makeFirstOrder')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}
function StatusBadge({ status, locale }) {
  let color = '#FFA500';
  let text = t(locale, 'statusCooking');
  let icon = 'time';
  if (status === 'courier') { color = '#3498db'; text = t(locale, 'statusCourier'); icon = 'bicycle'; }
  else if (status === 'completed') { color = '#2ecc71'; text = t(locale, 'statusDone'); icon = 'checkmark-circle'; }
  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      <Text style={{ color, fontWeight: 'bold', fontSize: 12 }}>{text}</Text>
    </View>
  );
}


const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },

  card: { borderRadius: 16, marginBottom: 16, borderWidth: 1, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  orderTitle: { fontSize: 16, fontWeight: 'bold' },
  date: { fontSize: 12, color: 'gray', marginTop: 2 },
  price: { fontSize: 18, fontWeight: 'bold' },

  divider: { height: 1, backgroundColor: '#eee', marginVertical: 12 },

  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20 },
  detailsBtn: { flexDirection: 'row', alignItems: 'center' },
  detailsText: { color: '#e334e3', fontWeight: '600', marginRight: 4 },

  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: '#e334e3', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});