import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, useRef } from 'react';
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setBottomBarVisible } from '../store/uiSlice';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../utils/dateUtils';
import { t } from '../constants/translations';
import { clearOrders, fetchOrders } from '../store/ordersSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { formatPrice, addToCart, clearCart } from '../store/cartSlice';
import { fs, hs, vs, r } from '../utils/responsive';
import * as Haptics from 'expo-haptics';
import BackButton from '../components/BackButton';

export default function OrdersTabScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const user = useSelector((state) => state.auth.user);
  const orders = useSelector((state) => state.orders.orders);
  const isLoading = useSelector((state) => state.orders.isLoading);
  const currentPage = useSelector((state) => state.orders.currentPage ?? 1);
  const hasMore = useSelector((state) => state.orders.hasMore ?? true);
  const isMoreLoading = useSelector((state) => state.orders.isMoreLoading ?? false);
  const locale = useSelector((state) => state.language?.locale ?? 'uk');
  const [refreshing, setRefreshing] = useState(false);
  const insets = useSafeAreaInsets();

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchOrders({ page: 1, pageSize: 20 })).unwrap();
    } catch (error) {
      console.error('Refresh orders failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Load orders from backend on screen mount and periodically
  useEffect(() => {
    dispatch(fetchOrders({ page: 1, pageSize: 20 }));
    
    const interval = setInterval(() => {
      dispatch(fetchOrders({ page: 1, pageSize: 20 }));
    }, 20000); // 20 seconds
    
    return () => clearInterval(interval);
  }, [dispatch]);

  const handleReorder = (orderItem) => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    }
    const products = orderItem.products || orderItem.items || [];
    if (products.length > 0) {
      dispatch(clearCart());
      products.forEach((prod) => {
        const itemToCart = {
          ...prod,
          id: prod.product_id ?? prod.productId ?? prod.id,
          product_id: prod.product_id ?? prod.productId ?? prod.id,
          name: prod.productName ?? prod.name ?? 'Товар',
          price: parseFloat(prod.price ?? prod.unitPrice ?? (prod.totalLineAmount && prod.quantity ? prod.totalLineAmount / prod.quantity : 0)) || 0,
          restaurantId: prod.restaurantId ?? prod.store_id ?? orderItem.restaurantId ?? orderItem.store_id ?? 1,
          store_id: prod.store_id ?? prod.restaurantId ?? orderItem.store_id ?? orderItem.restaurantId ?? 1,
          quantity: Math.max(1, parseInt(prod.quantity ?? prod.qty ?? 1, 10)),
          modifiers: prod.modifiers ?? prod.selectedModifiers ?? [],
        };
        dispatch(addToCart(itemToCart));
      });
      router.push('/cart');
    } else {
      Alert.alert(
        locale === 'en' ? 'Reorder' : 'Повторити замовлення',
        locale === 'en' ? 'No items found in this order.' : 'Не знайдено товарів у цьому замовленні.'
      );
    }
  };

  const renderOrderItem = ({ item }) => {
    // Prioritize numeric deliveryStatus from our normalization or backend
    const sNum = item.deliveryStatus ?? Number(item.statusDelivery ?? item.status ?? 0);
    const activeStatus = String(item.statusDelivery ?? item.status ?? 'created').toLowerCase();

    // Align with order-details config (0-6)
    let color = '#8e44ad';
    if (sNum === 6 || activeStatus === 'canceled' || activeStatus === 'cancelled') color = '#e74c3c';
    else if (sNum === 5 || activeStatus === 'delivered' || activeStatus === 'completed') color = '#2ecc71';
    else if (sNum === 4 || activeStatus === 'delivering' || activeStatus === 'picked_up') color = '#3498db';
    else if (sNum === 3 || activeStatus === 'ready_for_pickup' || activeStatus === 'ready') color = '#f39c12';
    else if (sNum === 2 || activeStatus === 'preparing') color = '#f39c12';
    else if (sNum === 1 || activeStatus === 'accepted') color = '#2ecc71';

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={() => router.push({ pathname: '/order-details', params: { id: item.deliveryId || item.id } })}
      >
        <View style={styles.cardHeader}>
          <View style={[styles.row, { flex: 1, marginRight: 8 }]}>
            <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
              <Ionicons name="receipt" size={20} color={color} />
            </View>
            <View style={{ marginLeft: 10, flex: 1 }}>
              <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1} maxFontSizeMultiplier={1.25}>
                {locale === 'en' ? 'Order ' : 'Замовлення '}{formatOrderNumber(item.deliveryId || item.id)}
              </Text>
              <Text style={styles.date} numberOfLines={1} maxFontSizeMultiplier={1.2}>{formatUkraineDate(item.createdAt || item.date)}</Text>
            </View>
          </View>
          <Text style={[styles.price, { color: theme.text }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8} maxFontSizeMultiplier={1.25}>
            {formatPrice(item.totalPrice || item.total)} ₴
          </Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <StatusBadge order={item} locale={locale} />
          <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 0 }}>
            <TouchableOpacity 
              style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: theme.primary + '18', paddingHorizontal: 9, paddingVertical: 5, borderRadius: 12, marginRight: 6 }}
              onPress={() => handleReorder(item)}
            >
              <Ionicons name="refresh-outline" size={13} color={theme.primary} style={{ marginRight: 3 }} />
              <Text maxFontSizeMultiplier={1.2} style={{ fontSize: fs(11), fontWeight: '600', color: theme.primary }}>
                {locale === 'en' ? 'Reorder' : 'Повторити'}
              </Text>
            </TouchableOpacity>
            <View style={styles.detailsBtn}>
              <Text maxFontSizeMultiplier={1.2} style={[styles.detailsText, { color: theme.primary, fontSize: fs(11) }]}>{t(locale, 'details')}</Text>
              <Ionicons name="chevron-forward" size={14} color={theme.primary} />
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const lastScrollY = useRef(0);
  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const isScrollingDown = currentOffset > lastScrollY.current;

    if (Math.abs(currentOffset - lastScrollY.current) > 15) {
      if (currentOffset <= 0) {
        dispatch(setBottomBarVisible(true));
      } else if (isScrollingDown && currentOffset > 100) {
        dispatch(setBottomBarVisible(false));
      } else {
        dispatch(setBottomBarVisible(true));
      }
      lastScrollY.current = currentOffset;
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.primary} style={{ flex: 1 }} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <FlatList
        onScroll={handleScroll}
        scrollEventThrottle={16}
        data={orders}
        keyExtractor={(item, index) => String(item.deliveryId || item.id || index)}
        renderItem={renderOrderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }}
        ListHeaderComponent={
          <View style={[styles.header, { paddingHorizontal: 0, paddingBottom: 16 }]}>
            <BackButton />
            <Text style={[styles.headerTitle, { color: theme.text, flex: 1, textAlign: 'center' }]}>{t(locale, 'ordersTitle')}</Text>
            <View style={{ width: 32 }} />
          </View>
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="receipt-outline" size={80} color={theme.textSecondary} style={{ opacity: 0.5 }} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{t(locale, 'emptyHistory')}</Text>
            <TouchableOpacity style={[styles.shopBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/home')}>
              <Text style={styles.shopBtnText}>{t(locale, 'makeFirstOrder')}</Text>
            </TouchableOpacity>
          </View>
        }
        onEndReached={() => {
          if (hasMore && !isMoreLoading) {
            dispatch(fetchOrders({ page: currentPage + 1, pageSize: 20 }));
          }
        }}
        onEndReachedThreshold={0.15}
        ListFooterComponent={
          isMoreLoading ? (
            <ActivityIndicator size="small" color={theme.primary} style={{ marginVertical: 16 }} />
          ) : null
        }
      />
    </SafeAreaView>
  );
}

function StatusBadge({ order, locale }) {
  let color = '#8e44ad';
  let text = locale === 'en' ? 'New' : 'Новий';
  let icon = 'receipt';

  const s = String(order.statusDelivery ?? order.status ?? '0').toLowerCase();
  const num = order.deliveryStatus ?? Number(s);

  if (num === 6 || s === 'canceled' || s === 'cancelled') {
    color = '#e74c3c';
    text = locale === 'en' ? 'Canceled' : 'Скасовано';
    icon = 'close-circle';
  } else if (num === 5 || s === 'delivered' || s === 'completed') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Delivered' : 'Доставлено';
    icon = 'home';
  } else if (num === 4 || s === 'delivering' || s === 'picked_up') {
    color = '#3498db';
    text = locale === 'en' ? 'Delivering' : 'Хутко мчить';
    icon = 'bicycle';
  } else if (num === 3 || s === 'ready_for_pickup' || s === 'ready') {
    color = '#f39c12';
    text = locale === 'en' ? 'Ready' : 'Готово до видачі';
    icon = 'cube';
  } else if (num === 2 || s === 'preparing') {
    color = '#f39c12';
    text = locale === 'en' ? 'Cooking' : 'Готується';
    icon = 'flame';
  } else if (num === 1 || s === 'accepted') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Confirmed' : 'Підтверджено';
    icon = 'checkmark-circle';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20', flexShrink: 1, marginRight: 6 }]}>
      <Ionicons name={icon} size={12} color={color} style={{ marginRight: 4 }} />
      <Text numberOfLines={1} maxFontSizeMultiplier={1.2} style={{ color, fontWeight: '800', fontSize: fs(11), textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  headerTitle: { fontSize: fs(20), fontWeight: 'bold' },
  clearBtn: { padding: 4 },
  card: {
    borderRadius: 24, marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 }
    })
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 40, height: 40, borderRadius: 14, justifyContent: 'center', alignItems: 'center', flexShrink: 0 },
  orderTitle: { fontSize: fs(15), fontWeight: '900', fontFamily: 'Menlo' },
  date: { fontSize: fs(12), color: 'gray', marginTop: 2, fontWeight: '600' },
  price: { fontSize: fs(15), fontWeight: '900', flexShrink: 0, marginLeft: 4 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(0,0,0,0.05)', marginVertical: 12 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  statusBadge: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 8, paddingVertical: 5, borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)'
  },
  detailsBtn: { flexDirection: 'row', alignItems: 'center' },
  detailsText: { color: '#000000', fontWeight: '600', marginRight: 4 },
  emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
  emptyText: { marginTop: 16, fontSize: 16, marginBottom: 24 },
  shopBtn: { backgroundColor: '#000000', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
