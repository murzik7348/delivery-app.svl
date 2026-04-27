import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, useColorScheme, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../constants/dateUtils';
import { t } from '../constants/translations';
import { clearOrders, fetchOrders } from '../store/ordersSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import BackButton from '../components/BackButton';

export default function OrdersTabScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const user = useSelector((state) => state.auth.user);
  const orders = useSelector((state) => state.orders.orders);
  const isLoading = useSelector((state) => state.orders.isLoading);
  const locale = useSelector((state) => state.language?.locale ?? 'uk');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchOrders()).unwrap();
    } catch (error) {
      console.error('Refresh orders failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load orders from backend on screen mount and periodically
  useEffect(() => {
    dispatch(fetchOrders());
    
    const interval = setInterval(() => {
      dispatch(fetchOrders());
    }, 20000); // 20 seconds
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const renderOrderItem = ({ item }) => {
    const statusNum = Number(item.statusDelivery || item.status || 0);
    // Align with order-details config
    let color = '#8e44ad';
    if (statusNum >= 6 || item.status === 'completed' || item.status === 'delivered') color = '#2ecc71';
    else if (statusNum === 5 || item.status === 'delivering') color = '#3498db';
    else if (statusNum === 4 || item.status === 'ready_for_pickup') color = '#f39c12';
    else if (statusNum === 3 || item.status === 'preparing') color = '#f39c12';
    else if (statusNum === 2 || item.status === 'paid') color = '#2ecc71';
    else if (statusNum === 1 || item.status === 'accepted') color = '#2ecc71';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: '/order-details', params: { id: item.deliveryId || item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={styles.row}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
              <Ionicons name="receipt" size={20} color={color} />
            </View>
            <View style={{ marginLeft: 12 }}>
              <Text style={[styles.orderTitle, { color: theme.text }]}>
                {locale === 'en' ? 'Order ' : 'Замовлення '}{formatOrderNumber(item.deliveryId || item.id)}
              </Text>
              <Text style={styles.date}>{formatUkraineDate(item.createdAt || item.date)}</Text>
            </View>
          </View>
          <Text style={[styles.price, { color: theme.text }]}>{item.totalPrice || item.total} ₴</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <StatusBadge status={item.statusDelivery || item.status} locale={locale} />
          <View style={styles.detailsBtn}>
            <Text style={styles.detailsText}>{t(locale, 'details')}</Text>
            <Ionicons name="chevron-forward" size={16} color="#e334e3" />
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#e334e3" style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        data={orders}
        keyExtractor={(item, index) => String(item.deliveryId || item.id || index)}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={[styles.header, { paddingHorizontal: 0, paddingBottom: 16 }]}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: theme.text, flex: 1, textAlign: 'center' }]}>{t(locale, 'ordersTitle')}</Text>
            <TouchableOpacity
              style={styles.clearBtn}
              onPress={() =>
                Alert.alert(
                  locale === 'en' ? 'Clear history' : 'Очистити історію',
                  locale === 'en' ? 'Are you sure you want to delete all orders?' : 'Ви впевнені, що хочете видалити всі замовлення?',
                  [
                    { text: locale === 'en' ? 'Cancel' : 'Скасувати', style: 'cancel' },
                    { text: locale === 'en' ? 'Clear' : 'Очистити', style: 'destructive', onPress: () => dispatch(clearOrders()) },
                  ]
                )
              }
            >
              <Ionicons name="trash-outline" size={24} color="#e334e3" />
            </TouchableOpacity>
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#e334e3"
            colors={["#e334e3"]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t(locale, 'emptyHistory')}</Text>
            <TouchableOpacity style={styles.shopBtn} onPress={() => router.push('/home')}>
              <Text style={styles.shopBtnText}>{t(locale, 'makeFirstOrder')}</Text>
            </TouchableOpacity>
          </View>
        }
      />
    </SafeAreaView>
  );
}

function StatusBadge({ status, locale }) {
  let color = '#8e44ad';
  let text = locale === 'en' ? 'New' : 'Новий';
  let icon = 'receipt';

  const statusNum = Number(status || 0);

  if (statusNum >= 6 || status === 'completed' || status === 'delivered') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Delivered' : 'Доставлено';
    icon = 'home';
  } else if (statusNum === 5 || status === 'delivering') {
    color = '#3498db';
    text = locale === 'en' ? 'Delivering' : 'Хутко мчить';
    icon = 'bicycle';
  } else if (statusNum === 4 || status === 'ready_for_pickup') {
    color = '#f39c12';
    text = locale === 'en' ? 'Ready' : 'Готово до видачі';
    icon = 'cube';
  } else if (statusNum === 3 || status === 'preparing') {
    color = '#f39c12';
    text = locale === 'en' ? 'Cooking' : 'Готується';
    icon = 'flame';
  } else if (statusNum === 2 || status === 'paid') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Paid' : 'Оплачено';
    icon = 'card';
  } else if (statusNum === 1 || status === 'accepted') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Confirmed' : 'Підтверджено';
    icon = 'checkmark-circle';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      <Text style={{ color, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  clearBtn: { padding: 4 },
  card: { borderRadius: 20, marginBottom: 16, borderWidth: 1, padding: 18, elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  orderTitle: { fontSize: 18, fontWeight: '900', fontFamily: 'Menlo' },
  date: { fontSize: 13, color: 'gray', marginTop: 4, fontWeight: '600' },
  price: { fontSize: 20, fontWeight: '900' },
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
