
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Easing,
  Dimensions,
  FlatList,
  Image,
  Keyboard,
  LayoutAnimation,
  Modal,
  PanResponder,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import {
  addToCart,
  clearCart,
  removeFromCart,
  setDeliveryType,
  setOrderNote,
  updateQuantity,
} from '../store/cartSlice';
import { showDynamicIsland } from '../store/uiSlice';
import { addOrder } from '../store/ordersSlice';
import * as LiveActivity from 'expo-live-activity';
import AddressBottomSheet from '../components/AddressBottomSheet';
import FakeApplePayModal from '../components/FakeApplePayModal';
import { products } from '../data/mockData';
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 158;
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.58;
const MAX_TRANS = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
const MIN_TRANS = 0;

/** Parse any value safely — never returns NaN. */
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Resolve a canonical ID from a product/cart item. */
const resolveId = (item) =>
  item?.product_id ?? item?.id ?? null;
export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const insets = useSafeAreaInsets();
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [payModalVisible, setPayModalVisible] = useState(false);
  const {
    items: cartItems,
    subtotal: rawSubtotal,
    totalAmount: rawTotal,
    discountAmount: rawDiscount,
    appliedPromo,
    deliveryType,
    deliveryFee: rawFee,
    orderNote,
  } = useSelector((s) => s.cart);

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const paymentId = useSelector((s) => s.payment?.selectedMethodId);
  const paymentMethods = useSelector((s) => s.payment?.methods ?? []);
  const savedAddresses = useSelector((s) => s.location.savedAddresses);
  const subtotal = safeNum(rawSubtotal);
  const totalAmount = safeNum(rawTotal);
  const discountAmount = safeNum(rawDiscount);
  const deliveryFee = deliveryType === 'delivery' ? safeNum(rawFee) : 0;

  const userAddress = savedAddresses?.length > 0 ? savedAddresses[0].address : t(locale, 'chooseAddressBtn');
  const activeMethod = paymentMethods.find(m => m.id === paymentId);
  const paymentInfo = activeMethod
    ? { name: activeMethod.type, icon: activeMethod.icon }
    : { name: t(locale, 'choosePayment'), icon: 'card-outline' };
  const recommendations = products
    .filter((p) => !cartItems.find((i) => resolveId(i) === p.product_id))
    .slice(0, 6);
  const translateY = useRef(new Animated.Value(MAX_TRANS)).current;
  const currentY = useRef(MAX_TRANS);
  useEffect(() => {
    const sub = translateY.addListener(({ value }) => { currentY.current = value; });
    return () => translateY.removeListener(sub);
  }, [translateY]);

  const keyboardOffset = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: e.endCoordinates.height,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start();
      }
    );
    return () => { show.remove(); hide.remove(); };
  }, [keyboardOffset]);

  const snapTo = useCallback((toValue) => {
    Animated.timing(translateY, {
      toValue,
      duration: 420,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: true,
    }).start();
  }, [translateY]);
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onMoveShouldSetPanResponderCapture: () => false,

      onPanResponderGrant: () => {
        translateY.extractOffset();
      },

      onPanResponderMove: (_, gs) => {
        let dy = gs.dy;
        const projected = currentY.current + dy;
        if (projected < MIN_TRANS) dy *= 0.25;
        else if (projected > MAX_TRANS) dy *= 0.25;
        translateY.setValue(dy);
      },

      onPanResponderRelease: (_, gs) => {
        translateY.flattenOffset();
        const cy = currentY.current;
        const vy = gs.vy;

        let target;
        if (vy > 0.4) target = MAX_TRANS;
        else if (vy < -0.4) target = MIN_TRANS;
        else target = cy < MAX_TRANS * 0.5 ? MIN_TRANS : MAX_TRANS;

        snapTo(target);
      },

      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        snapTo(currentY.current > MAX_TRANS / 2 ? MAX_TRANS : MIN_TRANS);
      },
    })
  ).current;
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      Alert.alert(
        locale === 'en' ? 'Not signed in' : 'Вхід не виконано',
        locale === 'en' ? 'Please sign in to place an order.' : 'Будь ласка, увійдіть у профіль для оформлення замовлення.',
        [
          { text: t(locale, 'no'), style: 'cancel' },
          { text: t(locale, 'login'), onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }

    // Require address if delivery
    if (deliveryType === 'delivery' && (!savedAddresses || savedAddresses.length === 0)) {
      setAddressSheetOpen(true);
      Alert.alert(
        locale === 'en' ? 'Address required' : 'Потрібна адреса',
        locale === 'en' ? 'Please add a delivery address first.' : 'Будь ласка, додайте адресу доставки перед оформленням.'
      );
      return;
    }

    // Require payment method
    if (!paymentId) {
      Alert.alert(
        locale === 'en' ? 'Payment method required' : 'Потрібен метод оплати',
        locale === 'en' ? 'Please select a payment method before checkout.' : 'Будь ласка, оберіть спосіб оплати перед оформленням.',
        [
          { text: t(locale, 'no') || 'Відміна', style: 'cancel' },
          { text: t(locale, 'paymentMethods') || 'Вибрати', onPress: () => router.push('/payment') }
        ]
      );
      return;
    }

    // Instead of instally placing order, show Fake Apple Pay Modal
    setPayModalVisible(true);
  };

  const processActualCheckout = () => {
    setPayModalVisible(false);

    const order = {
      id: Date.now().toString(),
      items: cartItems,
      total: totalAmount,
      discount: discountAmount,
      delivery: deliveryFee,
      promo: appliedPromo?.code ?? null,
      note: orderNote,
      type: deliveryType,
      date: new Date().toISOString(),
      status: 'pending',
      address: deliveryType === 'delivery' ? userAddress : (locale === 'en' ? 'Pickup from restaurant' : 'Самовивіз з ресторану'),
      payment: paymentInfo.name,
    };
    dispatch(addOrder(order));
    dispatch(clearCart());

    // Красиве In-App сповіщення
    dispatch(showDynamicIsland({
      title: locale === 'en' ? 'Success!' : 'Успішно!',
      message: locale === 'en' ? 'Order placed 🎉' : 'Замовлення оформлено 🎉',
      icon: 'checkmark-circle',
      type: 'success',
    }));

    // Дані для нашого нового Food Delivery Live Activity
    const rideData = JSON.stringify({
      status: "accepted",
      driverName: "Олександр",
      time: "24 min",
      orderId: order.id.slice(-4),
      totalPrice: `${totalAmount.toFixed(0)} ₴`
    });

    // Нативний виклик Live Activity (iOS 16.1+)
    LiveActivity.startActivity({
      title: locale === 'en' ? 'Order accepted' : 'Замовлення прийнято',
      subtitle: rideData, // Swift розкодує цей JSON
      progressBar: {
        date: new Date(Date.now() + 24 * 60 * 1000).getTime(),
      }
    }, {
      backgroundColor: '#0F0F0F',
      titleColor: '#ffffff',
      subtitleColor: '#ffffff',
      timerType: 'circular'
    });

    router.push('/orders');
  };
  const renderCartItem = ({ item }) => {
    const id = resolveId(item);
    return (
      <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
        {/* Left: image + name + price — tapping opens detail modal */}
        <TouchableOpacity
          style={styles.itemLeft}
          activeOpacity={0.75}
          onPress={() => setViewProduct(item)}
        >
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <View style={styles.itemInfo}>
            <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.itemPrice}>{safeNum(item.price).toFixed(0)} ₴</Text>
          </View>
        </TouchableOpacity>

        {/* Right: quantity stepper */}
        <View style={styles.stepper}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => {
              if (item.quantity > 1) dispatch(updateQuantity({ id, quantity: item.quantity - 1 }));
              else dispatch(removeFromCart(id));
            }}
          >
            <Ionicons name="remove-circle" size={32} color="#e334e3" />
          </TouchableOpacity>

          <Text style={[styles.stepperQty, { color: theme.text }]}>{item.quantity}</Text>

          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => dispatch(updateQuantity({ id, quantity: item.quantity + 1 }))}
          >
            <Ionicons name="add-circle" size={32} color="#e334e3" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };
  const renderRecItem = ({ item }) => (
    <View style={[styles.recCard, { backgroundColor: theme.card }]}>
      {/* Card body — tap to see detail */}
      <TouchableOpacity activeOpacity={0.8} onPress={() => setViewProduct(item)}>
        <Image source={{ uri: item.image }} style={styles.recImage} />
        <Text style={[styles.recName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.recPrice}>{safeNum(item.price).toFixed(0)} ₴</Text>
      </TouchableOpacity>

      {/* "+" button — separate TouchableOpacity, direct dispatch */}
      <TouchableOpacity
        style={styles.recAddBtn}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        onPress={() => dispatch(addToCart({ ...item }))}
      >
        <Ionicons name="add" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t(locale, 'cartTitle')}</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <Text style={styles.clearBtn}>{t(locale, 'clearCart')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Delivery toggle (тільки якщо є товари) ── */}
      {cartItems.length > 0 && (
        <View style={styles.headerPad}>
          <View style={[styles.toggle, { backgroundColor: theme.input }]}>
            {['delivery', 'pickup'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[styles.toggleBtn, deliveryType === type && styles.toggleBtnActive]}
                onPress={() => dispatch(setDeliveryType(type))}
              >
                <Text style={[styles.toggleText, deliveryType === type && styles.toggleTextActive]}>
                  {type === 'delivery' ? `🛵 ${t(locale, 'delivery')}` : `🏃 ${t(locale, 'pickup')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Content area ── */}
      {cartItems.length > 0 ? (
        <>
          {/* Scrollable list */}
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item, idx) => (resolveId(item) ?? idx).toString()}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: COLLAPSED_HEIGHT + insets.bottom + 32,
            }}
            ListFooterComponent={
              recommendations.length > 0 ? (
                <View style={styles.recSection}>
                  <Text style={[styles.recTitle, { color: theme.text }]}>
                    {t(locale, 'recommended')}
                  </Text>
                  <FlatList
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    data={recommendations}
                    keyExtractor={(item) => resolveId(item).toString()}
                    renderItem={renderRecItem}
                    contentContainerStyle={{ paddingLeft: 16 }}
                  />
                </View>
              ) : null
            }
          />

          {/* ── THE ONE AND ONLY BOTTOM SHEET ──────────────────────────────
           *
           * Architecture:
           *   • Fixed height = EXPANDED_HEIGHT
           *   • position: absolute, bottom: 0, left: 0, right: 0
           *   • Starts at translateY = MAX_TRANS (collapsed, COLLAPSED_HEIGHT visible)
           *   • Swipe up  → translateY → 0    (fully expanded)
           *   • Swipe down → translateY → MAX_TRANS (back to collapsed)
           *   • Sheet never goes below MAX_TRANS (never fully hides)
           *
           * PanResponder ONLY on dragHandleArea — this is what lets buttons
           * inside the sheet receive onPress events normally.
           */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                shadowColor: theme.text,
                height: EXPANDED_HEIGHT,
                transform: [{
                  translateY: Animated.add(
                    translateY.interpolate({
                      inputRange: [MIN_TRANS, MAX_TRANS],
                      outputRange: [MIN_TRANS, MAX_TRANS],
                      extrapolate: 'clamp',
                    }),
                    keyboardOffset.interpolate({
                      inputRange: [0, 1000],
                      outputRange: [0, -1000],
                    })
                  ),
                }],
              },
            ]}
          >
            {/* ── Drag handle (PanResponder lives HERE only) ── */}
            <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
              <View style={styles.dragPill} />
            </View>


            {/* ════════════════════════════════════════════════════════
             * COLLAPSED ZONE — always visible, always interactive
             * ════════════════════════════════════════════════════════ */}
            <View style={styles.collapsedZone}>
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>{t(locale, 'toPay')}</Text>
                <Text style={[styles.totalValue, { color: theme.text }]}>
                  {totalAmount.toFixed(0)} ₴
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                activeOpacity={0.85}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutBtnText}>{t(locale, 'placeOrder')}</Text>
              </TouchableOpacity>
            </View>

            {/* ════════════════════════════════════════════════════════
             * EXPANDED ZONE — revealed when sheet is swiped up
             * ════════════════════════════════════════════════════════ */}
            <View style={styles.expandedZone}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Price breakdown */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: 'gray' }]}>{t(locale, 'goods')}</Text>
                <Text style={[styles.priceValue, { color: theme.text }]}>
                  {subtotal.toFixed(0)} ₴
                </Text>
              </View>

              {deliveryType === 'delivery' && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: 'gray' }]}>{t(locale, 'deliveryFee')}</Text>
                  <Text style={[styles.priceValue, { color: theme.text }]}>
                    {deliveryFee === 0 ? (locale === 'en' ? 'Free' : 'Безкоштовно') : `${deliveryFee.toFixed(0)} ₴`}
                  </Text>
                </View>
              )}

              {appliedPromo && discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#e334e3' }]}>
                    {t(locale, 'discount')} ({appliedPromo.code})
                  </Text>
                  <Text style={[styles.priceValue, { color: '#e334e3' }]}>
                    −{discountAmount.toFixed(0)} ₴
                  </Text>
                </View>
              )}

              <View style={{ height: 14 }} />

              {/* Promo code row */}
              <TouchableOpacity
                style={[styles.actionRow, { backgroundColor: theme.input }]}
                activeOpacity={0.75}
                onPress={() => router.push('/promocodes')}
              >
                <View style={styles.actionRowLeft}>
                  <Ionicons name="ticket-outline" size={20} color="#e334e3" />
                  <Text style={[styles.actionRowText, { color: theme.text }]}>
                    {appliedPromo ? appliedPromo.code : t(locale, 'promoCode')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="gray" />
              </TouchableOpacity>

              {/* Address row (delivery only) */}
              {deliveryType === 'delivery' && (
                <TouchableOpacity
                  style={[styles.actionRow, { backgroundColor: theme.input }]}
                  activeOpacity={0.75}
                  onPress={() => setAddressSheetOpen(true)}
                >
                  <View style={[styles.actionRowLeft, { flex: 1 }]}>
                    <Ionicons name="location-outline" size={20} color={theme.text} />
                    <Text
                      style={[styles.actionRowText, { color: theme.text, flex: 1 }]}
                      numberOfLines={1}
                    >
                      {userAddress}
                    </Text>
                  </View>
                  <Text style={styles.changeText}>{t(locale, 'change')}</Text>
                </TouchableOpacity>
              )}

              {/* Payment row */}
              <TouchableOpacity
                style={[styles.actionRow, { backgroundColor: theme.input }]}
                activeOpacity={0.75}
                onPress={() => router.push('/payment')}
              >
                <View style={styles.actionRowLeft}>
                  <Ionicons name={paymentInfo.icon} size={20} color={theme.text} />
                  <Text style={[styles.actionRowText, { color: theme.text }]}>
                    {paymentInfo.name}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="gray" />
              </TouchableOpacity>

              {/* Order note */}
              <View style={{ marginTop: 6, paddingBottom: insets.bottom + 12 }}>
                {!noteVisible && !orderNote ? (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setNoteVisible(true);
                    }}
                  >
                    <Text style={styles.addNoteText}>{t(locale, 'addComment')}</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.noteBox, { backgroundColor: theme.input }]}>
                    <TextInput
                      style={[styles.noteInput, { color: theme.text }]}
                      placeholder={locale === 'en' ? 'Doorbell code, cutlery...' : 'Код домофону, прибори...'}
                      placeholderTextColor="gray"
                      value={orderNote}
                      onChangeText={(val) => dispatch(setOrderNote(val))}
                      multiline
                      blurOnSubmit
                      returnKeyType="done"
                      returnKeyLabel="Готово"
                      onSubmitEditing={() => Keyboard.dismiss()}
                    />
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </>
      ) : (
        /* ── Empty state ── */
        <View style={styles.emptyState}>
          <Ionicons name="cart-outline" size={80} color="gray" />
          <Text style={[styles.emptyText, { color: theme.text }]}>{t(locale, 'emptyCart')}</Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: theme.card }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.shopBtnText, { color: theme.text }]}>{locale === 'en' ? 'To menu' : 'В меню'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Product detail modal ── */}
      <Modal
        animationType="slide"
        transparent
        visible={!!viewProduct}
        onRequestClose={() => setViewProduct(null)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setViewProduct(null)}
        >
          {/* Inner TouchableOpacity prevents backdrop close on sheet tap */}
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.productSheet, { backgroundColor: theme.card }]}
          >
            <View style={styles.productSheetPill} />
            {viewProduct && (
              <>
                <Image source={{ uri: viewProduct.image }} style={styles.productSheetImage} />
                <View style={styles.productSheetBody}>
                  <View style={styles.productSheetTitleRow}>
                    <Text style={[styles.productSheetTitle, { color: theme.text }]}>
                      {viewProduct.name}
                    </Text>
                    <Text style={styles.productSheetPrice}>
                      {safeNum(viewProduct.price).toFixed(0)} ₴
                    </Text>
                  </View>
                  <Text style={[styles.productSheetDesc, { color: theme.textSecondary ?? 'gray' }]}>
                    {viewProduct.description || 'Опис відсутній.'}
                  </Text>

                  {/* If already in cart → close; else add */}
                  {cartItems.find((i) => resolveId(i) === resolveId(viewProduct)) ? (
                    <TouchableOpacity
                      style={styles.productSheetBtn}
                      onPress={() => setViewProduct(null)}
                    >
                      <Text style={styles.productSheetBtnText}>Зрозуміло</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={styles.productSheetBtn}
                      onPress={() => {
                        dispatch(addToCart({ ...viewProduct }));
                        setViewProduct(null);
                      }}
                    >
                      <Text style={styles.productSheetBtnText}>Додати в кошик</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Address picker bottom sheet */}
      <AddressBottomSheet
        visible={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />

      {/* Fake Apple Pay Module */}
      <FakeApplePayModal
        visible={payModalVisible}
        amount={totalAmount.toFixed(0)}
        onClose={() => setPayModalVisible(false)}
        onPaymentSuccess={processActualCheckout}
      />
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  clearBtn: { color: '#ff3b30', fontWeight: '600', fontSize: 15 },
  headerPad: { paddingHorizontal: 20, paddingBottom: 10 },
  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, height: 44 },
  toggleBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText: { fontWeight: '600', color: 'gray' },
  toggleTextActive: { color: 'black' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, borderRadius: 20, marginHorizontal: 16 },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  itemImage: { width: 66, height: 66, borderRadius: 16, backgroundColor: '#eee' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  itemPrice: { color: '#e334e3', fontWeight: 'bold', marginTop: 4 },
  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperQty: { marginHorizontal: 10, fontSize: 18, fontWeight: 'bold' },
  recSection: { marginTop: 22, marginBottom: 20 },
  recTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  recCard: { width: 138, marginRight: 14, borderRadius: 16, padding: 10, alignItems: 'center', elevation: 2 },
  recImage: { width: 100, height: 78, borderRadius: 12, marginBottom: 7, backgroundColor: '#eee' },
  recName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  recPrice: { color: '#e334e3', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  recAddBtn: {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: '#e334e3',
    borderRadius: 14, width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 0,
    elevation: 28,
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: -6 },
    zIndex: 999,
  },
  dragHandleArea: {
    alignItems: 'center',
    paddingVertical: 14,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dragPill: {
    width: 44, height: 5,
    backgroundColor: '#C6C6CC',
    borderRadius: 3,
  },
  collapsedZone: { paddingBottom: 18 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLabel: { fontSize: 17, fontWeight: '700' },
  totalValue: { fontSize: 26, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#e334e3', borderRadius: 18, padding: 16, alignItems: 'center' },
  checkoutBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  expandedZone: { flex: 1 },
  divider: { height: 1, marginBottom: 14, opacity: 0.35 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  priceLabel: { fontSize: 15 },
  priceValue: { fontSize: 15, fontWeight: '600' },

  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 14, marginBottom: 9 },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center' },
  actionRowText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  changeText: { color: '#e334e3', fontSize: 13, fontWeight: '600' },
  addNoteText: { color: '#e334e3', fontWeight: 'bold', paddingVertical: 6 },
  noteBox: { borderRadius: 14, padding: 12 },
  noteInput: { fontSize: 14, maxHeight: 70, lineHeight: 20 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 },
  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  productSheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, width: '100%', maxHeight: '82%' },
  productSheetPill: { width: 44, height: 5, backgroundColor: '#ccc', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  productSheetImage: { width: '100%', height: 230, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  productSheetBody: { padding: 20 },
  productSheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  productSheetTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 10 },
  productSheetPrice: { fontSize: 22, fontWeight: 'bold', color: '#e334e3' },
  productSheetDesc: { fontSize: 15, marginTop: 8, marginBottom: 24, lineHeight: 23 },
  productSheetBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 18, alignItems: 'center' },
  productSheetBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});