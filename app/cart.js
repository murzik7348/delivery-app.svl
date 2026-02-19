
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  FlatList,
  Image,
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
import {
  addToCart,
  clearCart,
  removeFromCart,
  setDeliveryType,
  setOrderNote,
  updateQuantity,
} from '../store/cartSlice';
import { addOrder } from '../store/ordersSlice';
import AddressBottomSheet from '../components/AddressBottomSheet';
import { products } from '../data/mockData';

// ─── Enable LayoutAnimation on Android ────────────────────────────────────────
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Sheet geometry ────────────────────────────────────────────────────────────
//   COLLAPSED_HEIGHT  = pixels visible when sheet is "closed"
//   EXPANDED_HEIGHT   = total sheet height when fully open (72% of screen)
//   MAX_TRANS         = how far down the sheet translates when collapsed
//                       (so only COLLAPSED_HEIGHT peeks above the bottom)
//   MIN_TRANS         = 0 → sheet is at its natural (expanded) position
const COLLAPSED_HEIGHT = 158;
const EXPANDED_HEIGHT  = SCREEN_HEIGHT * 0.72;
const MAX_TRANS        = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
const MIN_TRANS        = 0;

// ─── Helpers ───────────────────────────────────────────────────────────────────
const PAYMENT_MAP = {
  '1':    { name: 'Apple Pay',  icon: 'logo-apple'  },
  '2':    { name: 'Google Pay', icon: 'logo-google' },
  '3':    { name: 'Готівка',    icon: 'cash'        },
  card:   { name: 'Картка',     icon: 'card'        },
};

const getPaymentInfo = (id) => PAYMENT_MAP[id] ?? { name: 'Apple Pay', icon: 'logo-apple' };

/** Parse any value safely — never returns NaN. */
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Resolve a canonical ID from a product/cart item. */
const resolveId = (item) =>
  item?.product_id ?? item?.id ?? null;

// ══════════════════════════════════════════════════════════════════════════════
export default function CartScreen() {
  const router      = useRouter();
  const dispatch    = useDispatch();
  const colorScheme = useColorScheme();
  const theme       = Colors[colorScheme ?? 'light'];
  const insets      = useSafeAreaInsets();

  // ── Local UI state ─────────────────────────────────────────────────────────
  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [noteVisible,      setNoteVisible]       = useState(false);
  const [viewProduct,      setViewProduct]        = useState(null);

  // ── Redux state ────────────────────────────────────────────────────────────
  const {
    items:          cartItems,
    subtotal:       rawSubtotal,
    totalAmount:    rawTotal,
    discountAmount: rawDiscount,
    appliedPromo,
    deliveryType,
    deliveryFee:    rawFee,
    orderNote,
  } = useSelector((s) => s.cart);

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const paymentId       = useSelector((s) => s.payment?.selectedMethodId);
  const savedAddresses  = useSelector((s) => s.location.savedAddresses);

  // Safe numbers — no NaN anywhere
  const subtotal       = safeNum(rawSubtotal);
  const totalAmount    = safeNum(rawTotal);
  const discountAmount = safeNum(rawDiscount);
  const deliveryFee    = deliveryType === 'delivery' ? safeNum(rawFee) : 0;

  const userAddress  = savedAddresses?.length > 0 ? savedAddresses[0].address : 'Оберіть адресу';
  const paymentInfo  = getPaymentInfo(paymentId);

  // Items NOT yet in the cart — shown as horizontal recommendations
  const recommendations = products
    .filter((p) => !cartItems.find((i) => resolveId(i) === p.product_id))
    .slice(0, 6);

  // ── Bottom sheet animation ─────────────────────────────────────────────────
  //
  // We use React Native's own `Animated` + `PanResponder` from 'react-native'.
  // NEVER import Animated from react-native-reanimated and then pair it with
  // PanResponder — they are different animation runtimes and will crash.
  //
  // translateY range:
  //   MIN_TRANS (0)   = expanded
  //   MAX_TRANS       = collapsed (only COLLAPSED_HEIGHT visible)
  //
  const translateY  = useRef(new Animated.Value(MAX_TRANS)).current;

  // Track current value without accessing private ._value internals
  const currentY = useRef(MAX_TRANS);
  useEffect(() => {
    const sub = translateY.addListener(({ value }) => { currentY.current = value; });
    return () => translateY.removeListener(sub);
  }, [translateY]);

  const snapTo = useCallback((toValue) => {
    Animated.spring(translateY, {
      toValue,
      useNativeDriver: true,
      tension:           70,
      friction:          12,
      overshootClamping: true,
    }).start();
  }, [translateY]);

  // PanResponder lives only on the DRAG HANDLE (44px pill area at the top
  // of the sheet). Creating it synchronously inside useRef() ensures the
  // handlers exist on the very first render — a useEffect() creation would
  // leave the first render with no handlers.
  const panResponder = useRef(
    PanResponder.create({
      // Only respond to vertical gestures
      onMoveShouldSetPanResponder:        (_, gs) => Math.abs(gs.dy) > 5,
      onMoveShouldSetPanResponderCapture: (_, gs) => Math.abs(gs.dy) > 8,

      onPanResponderGrant: () => {
        // Capture current animated value as offset so movement starts from here
        translateY.setOffset(currentY.current);
        translateY.setValue(0);
      },

      onPanResponderMove: (_, gs) => {
        let dy = gs.dy;
        const projected = currentY.current + dy;
        // Rubber-band: heavy resistance beyond snap limits
        if (projected < MIN_TRANS) dy *= 0.18;
        else if (projected > MAX_TRANS) dy *= 0.18;
        translateY.setValue(dy);
      },

      onPanResponderRelease: (_, gs) => {
        translateY.flattenOffset();
        const cy  = currentY.current;
        const vy  = gs.vy;

        let target;
        if      (vy >  0.5) target = MAX_TRANS; // fast flick down → collapse
        else if (vy < -0.5) target = MIN_TRANS;  // fast flick up   → expand
        else target = cy < MAX_TRANS * 0.45 ? MIN_TRANS : MAX_TRANS;

        snapTo(target);
      },

      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        snapTo(currentY.current > MAX_TRANS / 2 ? MAX_TRANS : MIN_TRANS);
      },
    })
  ).current;

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      Alert.alert(
        'Вхід не виконано',
        'Будь ласка, увійдіть у профіль для оформлення замовлення.',
        [
          { text: 'Відміна', style: 'cancel' },
          { text: 'Увійти', onPress: () => router.push('/(auth)/login') },
        ]
      );
      return;
    }
    const order = {
      id:       Date.now().toString(),
      items:    cartItems,
      total:    totalAmount,
      discount: discountAmount,
      delivery: deliveryFee,
      promo:    appliedPromo?.code ?? null,
      note:     orderNote,
      type:     deliveryType,
      date:     new Date().toISOString(),
      status:   'pending',
      address:  deliveryType === 'delivery' ? userAddress : 'Самовивіз з ресторану',
      payment:  paymentInfo.name,
    };
    dispatch(addOrder(order));
    dispatch(clearCart());
    Alert.alert('Успішно!', 'Замовлення оформлено 🎉', [
      { text: 'OK', onPress: () => router.push('/orders') },
    ]);
  };

  // ── Cart item row ──────────────────────────────────────────────────────────
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

  // ── Recommendation card ────────────────────────────────────────────────────
  //
  // BUG 2 FIX: The "+" button is its own TouchableOpacity that dispatches
  // addToCart directly. It is NOT nested inside the card's TouchableOpacity.
  // This prevents any event bubbling ambiguity and the wrong-item Redux bug
  // (which is also fixed in cartSlice.js).
  //
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

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <SafeAreaView
      edges={['top']}
      style={[styles.container, { backgroundColor: theme.background }]}
    >
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Кошик</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <Text style={styles.clearBtn}>Очистити</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Delivery toggle ── */}
      <View style={styles.headerPad}>
        <View style={[styles.toggle, { backgroundColor: theme.input }]}>
          {['delivery', 'pickup'].map((type) => (
            <TouchableOpacity
              key={type}
              style={[styles.toggleBtn, deliveryType === type && styles.toggleBtnActive]}
              onPress={() => dispatch(setDeliveryType(type))}
            >
              <Text style={[styles.toggleText, deliveryType === type && styles.toggleTextActive]}>
                {type === 'delivery' ? '🛵 Доставка' : '🏃 Самовивіз'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

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
              // Extra bottom padding so items are never hidden behind the sheet
              paddingBottom: COLLAPSED_HEIGHT + insets.bottom + 32,
            }}
            ListFooterComponent={
              recommendations.length > 0 ? (
                <View style={styles.recSection}>
                  <Text style={[styles.recTitle, { color: theme.text }]}>
                    З цим смакує 🔥
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
                shadowColor:      theme.text,
                height:           EXPANDED_HEIGHT,
                transform: [{
                  translateY: translateY.interpolate({
                    inputRange:  [MIN_TRANS, MAX_TRANS],
                    outputRange: [MIN_TRANS, MAX_TRANS],
                    extrapolate: 'clamp',
                  }),
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
                <Text style={[styles.totalLabel, { color: theme.text }]}>До сплати:</Text>
                <Text style={[styles.totalValue, { color: theme.text }]}>
                  {totalAmount.toFixed(0)} ₴
                </Text>
              </View>

              <TouchableOpacity
                style={styles.checkoutBtn}
                activeOpacity={0.85}
                onPress={handleCheckout}
              >
                <Text style={styles.checkoutBtnText}>Оформити замовлення</Text>
              </TouchableOpacity>
            </View>

            {/* ════════════════════════════════════════════════════════
             * EXPANDED ZONE — revealed when sheet is swiped up
             * ════════════════════════════════════════════════════════ */}
            <View style={styles.expandedZone}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Price breakdown */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: 'gray' }]}>Товари</Text>
                <Text style={[styles.priceValue, { color: theme.text }]}>
                  {subtotal.toFixed(0)} ₴
                </Text>
              </View>

              {deliveryType === 'delivery' && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: 'gray' }]}>Доставка</Text>
                  <Text style={[styles.priceValue, { color: theme.text }]}>
                    {deliveryFee === 0 ? 'Безкоштовно' : `${deliveryFee.toFixed(0)} ₴`}
                  </Text>
                </View>
              )}

              {appliedPromo && discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: '#e334e3' }]}>
                    Знижка ({appliedPromo.code})
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
                    {appliedPromo ? appliedPromo.code : 'Промокод'}
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
                  <Text style={styles.changeText}>Змінити</Text>
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
                    <Text style={styles.addNoteText}>+ Коментар до замовлення</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.noteBox, { backgroundColor: theme.input }]}>
                    <TextInput
                      style={[styles.noteInput, { color: theme.text }]}
                      placeholder="Код домофону, прибори..."
                      placeholderTextColor="gray"
                      value={orderNote}
                      onChangeText={(t) => dispatch(setOrderNote(t))}
                      multiline
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
          <Text style={[styles.emptyText, { color: theme.text }]}>Кошик порожній</Text>
          <TouchableOpacity
            style={[styles.shopBtn, { backgroundColor: theme.card }]}
            onPress={() => router.push('/(tabs)')}
          >
            <Text style={[styles.shopBtnText, { color: theme.text }]}>В меню</Text>
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
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container:    { flex: 1 },

  // Header
  header:       { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
  headerTitle:  { fontSize: 28, fontWeight: 'bold' },
  clearBtn:     { color: '#ff3b30', fontWeight: '600', fontSize: 15 },
  headerPad:    { paddingHorizontal: 20, paddingBottom: 10 },

  // Delivery toggle
  toggle:          { flexDirection: 'row', borderRadius: 12, padding: 4, height: 44 },
  toggleBtn:       { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 4, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  toggleText:      { fontWeight: '600', color: 'gray' },
  toggleTextActive:{ color: 'black' },

  // Cart item
  itemCard:   { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, borderRadius: 20, marginHorizontal: 16 },
  itemLeft:   { flex: 1, flexDirection: 'row', alignItems: 'center' },
  itemImage:  { width: 66, height: 66, borderRadius: 16, backgroundColor: '#eee' },
  itemInfo:   { flex: 1, marginLeft: 12 },
  itemName:   { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  itemPrice:  { color: '#e334e3', fontWeight: 'bold', marginTop: 4 },
  stepper:    { flexDirection: 'row', alignItems: 'center' },
  stepperQty: { marginHorizontal: 10, fontSize: 18, fontWeight: 'bold' },

  // Recommendations
  recSection: { marginTop: 22, marginBottom: 20 },
  recTitle:   { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  recCard:    { width: 138, marginRight: 14, borderRadius: 16, padding: 10, alignItems: 'center', elevation: 2 },
  recImage:   { width: 100, height: 78, borderRadius: 12, marginBottom: 7, backgroundColor: '#eee' },
  recName:    { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  recPrice:   { color: '#e334e3', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  recAddBtn:  {
    position: 'absolute', bottom: 8, right: 8,
    backgroundColor: '#e334e3',
    borderRadius: 14, width: 28, height: 28,
    justifyContent: 'center', alignItems: 'center',
  },

  // ── Bottom sheet ──────────────────────────────────────────────────────────
  sheet: {
    position:             'absolute',
    bottom:               0,
    left:                 0,
    right:                0,
    borderTopLeftRadius:  28,
    borderTopRightRadius: 28,
    paddingHorizontal:    20,
    paddingTop:           0,
    elevation:            28,
    shadowOpacity:        0.18,
    shadowRadius:         14,
    shadowOffset:         { width: 0, height: -6 },
    zIndex:               999,
  },

  // Drag handle — panHandlers are attached ONLY to this view
  dragHandleArea: {
    alignItems:        'center',
    paddingVertical:   14,
    marginHorizontal: -20,
    paddingHorizontal: 20,
  },
  dragPill: {
    width: 44, height: 5,
    backgroundColor: '#C6C6CC',
    borderRadius: 3,
  },

  // Collapsed zone (total + checkout button)
  collapsedZone: { paddingBottom: 18 },
  totalRow:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  totalLabel:    { fontSize: 17, fontWeight: '700' },
  totalValue:    { fontSize: 26, fontWeight: 'bold' },
  checkoutBtn:   { backgroundColor: '#e334e3', borderRadius: 18, padding: 16, alignItems: 'center' },
  checkoutBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  // Expanded zone
  expandedZone: { flex: 1 },
  divider:      { height: 1, marginBottom: 14, opacity: 0.35 },
  priceRow:     { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 9 },
  priceLabel:   { fontSize: 15 },
  priceValue:   { fontSize: 15, fontWeight: '600' },

  actionRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 13, borderRadius: 14, marginBottom: 9 },
  actionRowLeft:  { flexDirection: 'row', alignItems: 'center' },
  actionRowText:  { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  changeText:     { color: '#e334e3', fontSize: 13, fontWeight: '600' },
  addNoteText:    { color: '#e334e3', fontWeight: 'bold', paddingVertical: 6 },
  noteBox:        { borderRadius: 14, padding: 12 },
  noteInput:      { fontSize: 14, maxHeight: 70, lineHeight: 20 },

  // Empty state
  emptyState:   { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText:    { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn:      { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  shopBtnText:  { fontWeight: 'bold', fontSize: 16 },

  // Product detail modal
  modalBackdrop:        { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  productSheet:         { borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingBottom: 40, width: '100%', maxHeight: '82%' },
  productSheetPill:     { width: 44, height: 5, backgroundColor: '#ccc', borderRadius: 3, alignSelf: 'center', marginTop: 12, marginBottom: 6 },
  productSheetImage:    { width: '100%', height: 230, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  productSheetBody:     { padding: 20 },
  productSheetTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 },
  productSheetTitle:    { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 10 },
  productSheetPrice:    { fontSize: 22, fontWeight: 'bold', color: '#e334e3' },
  productSheetDesc:     { fontSize: 15, marginTop: 8, marginBottom: 24, lineHeight: 23 },
  productSheetBtn:      { backgroundColor: '#e334e3', padding: 16, borderRadius: 18, alignItems: 'center' },
  productSheetBtnText:  { color: 'white', fontSize: 16, fontWeight: 'bold' },
});