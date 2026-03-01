
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
  decrementItem,
  removeItem,
  updateQuantity,
  selectCartSummary,
  setDeliveryType,
  setOrderNote,
  FREE_DELIVERY_THRESHOLD,
  MIN_ORDER_AMOUNT,
} from '../store/cartSlice';
import AddressBottomSheet from '../components/AddressBottomSheet';
import FakeApplePayModal from '../components/FakeApplePayModal';
import useCheckoutFlow from '../hooks/useCheckoutFlow';
import { products } from '../data/mockData';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const COLLAPSED_HEIGHT = 200; // slightly taller to fit progress bar
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.62;
const MAX_TRANS = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
const MIN_TRANS = 0;

const NEON = '#e334e3';

/** Parse any value safely — never returns NaN. */
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/** Resolve a canonical ID from a product/cart item. */
const resolveId = (item) => item?.product_id ?? item?.id ?? null;

// ─────────────────────────────────────────────────────────────────────────────
// Delivery-progress bar (Feature 1)
// ─────────────────────────────────────────────────────────────────────────────
function DeliveryProgressBar({ progress, amountToFreeDelivery, locale, theme }) {
  const anim = useRef(new Animated.Value(progress)).current;

  useEffect(() => {
    Animated.timing(anim, {
      toValue: progress,
      duration: 480,
      easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
      useNativeDriver: false,
    }).start();
  }, [progress]);

  const isFree = amountToFreeDelivery === 0;

  return (
    <View style={progressStyles.wrapper}>
      <Text style={[progressStyles.label, { color: theme.text }]}>
        {isFree
          ? (locale === 'en' ? '🎉 Free delivery unlocked!' : '🎉 Безкоштовна доставка!')
          : (locale === 'en'
            ? `${amountToFreeDelivery.toFixed(0)} ₴ more for free delivery`
            : `Ще ${amountToFreeDelivery.toFixed(0)} ₴ до безкоштовної доставки`)}
      </Text>
      <View style={[progressStyles.track, { backgroundColor: theme.input }]}>
        <Animated.View
          style={[
            progressStyles.fill,
            {
              backgroundColor: isFree ? '#22c55e' : NEON,
              width: anim.interpolate({
                inputRange: [0, 1],
                outputRange: ['0%', '100%'],
                extrapolate: 'clamp',
              }),
            },
          ]}
        />
      </View>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', marginBottom: 6, letterSpacing: 0.2 },
  track: { height: 6, borderRadius: 3, overflow: 'hidden' },
  fill: { height: 6, borderRadius: 3 },
});

// ─────────────────────────────────────────────────────────────────────────────
// Modifier chips (Feature 2)
// ─────────────────────────────────────────────────────────────────────────────
function ModifierChips({ modifiers }) {
  if (!modifiers || modifiers.length === 0) return null;
  return (
    <View style={chipStyles.row}>
      {modifiers.map((m, i) => (
        <View key={i} style={chipStyles.chip}>
          <Text style={chipStyles.text}>
            {m.price >= 0 ? '+' : '−'} {m.name}
          </Text>
        </View>
      ))}
    </View>
  );
}

const chipStyles = StyleSheet.create({
  row: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 5, gap: 4 },
  chip: {
    borderWidth: 1,
    borderColor: NEON,
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(227,52,227,0.08)',
  },
  text: { fontSize: 10, color: NEON, fontWeight: '600' },
});

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────
export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector((s) => s.language?.locale ?? 'uk');
  const insets = useSafeAreaInsets();

  const { initiateCheckout, processActualCheckout, payModalVisible, setPayModalVisible, isLoading } =
    useCheckoutFlow();

  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);

  // ── Redux state ────────────────────────────────────────────────────────────
  const cartItems = useSelector((s) => s.cart.items);
  const appliedPromo = useSelector((s) => s.cart.appliedPromo);
  const deliveryType = useSelector((s) => s.cart.deliveryType);
  const orderNote = useSelector((s) => s.cart.orderNote);
  const {
    subtotal,
    discountAmount,
    deliveryFee,
    total: totalAmount,
    originalTotal,
    isMinOrderMet,
    amountToFreeDelivery,
    freeDeliveryProgress,
  } = useSelector(selectCartSummary);

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const paymentId = useSelector((s) => s.payment?.selectedMethodId);
  const paymentMethods = useSelector((s) => s.payment?.methods ?? []);
  const savedAddresses = useSelector((s) => s.location.savedAddresses);

  const userAddress =
    savedAddresses?.length > 0 ? savedAddresses[0].address : t(locale, 'chooseAddressBtn');
  const activeMethod = paymentMethods.find((m) => m.id === paymentId);
  const paymentInfo = activeMethod
    ? { name: activeMethod.type, icon: activeMethod.icon }
    : { name: t(locale, 'choosePayment'), icon: 'card-outline' };

  const recommendations = products
    .filter((p) => !cartItems.find((i) => resolveId(i) === p.product_id))
    .slice(0, 6);

  // ── Bottom sheet animation ─────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(MAX_TRANS)).current;
  const currentY = useRef(MAX_TRANS);

  useEffect(() => {
    const sub = translateY.addListener(({ value }) => {
      currentY.current = value;
    });
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
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardOffset]);

  const snapTo = useCallback(
    (toValue) => {
      Animated.timing(translateY, {
        toValue,
        duration: 420,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }).start();
    },
    [translateY]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 2,
      onMoveShouldSetPanResponderCapture: () => false,
      onPanResponderGrant: () => { translateY.extractOffset(); },
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

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    if (!isMinOrderMet) return; // guard — button is also visually disabled
    initiateCheckout();
  };

  // ── Feature 4: Safe decrement with Alert────────────────────────────────────
  const handleDecrement = useCallback(
    (item) => {
      if (item.quantity > 1) {
        dispatch(decrementItem(item.cartKey));
      } else {
        Alert.alert(
          locale === 'en' ? 'Remove item?' : 'Видалити товар?',
          locale === 'en'
            ? `Remove "${item.name}" from your cart?`
            : `Прибрати "${item.name}" з кошика?`,
          [
            { text: locale === 'en' ? 'Cancel' : 'Скасувати', style: 'cancel' },
            {
              text: locale === 'en' ? 'Remove' : 'Видалити',
              style: 'destructive',
              onPress: () => {
                LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                dispatch(removeItem(item.cartKey));
              },
            },
          ]
        );
      }
    },
    [dispatch, locale]
  );

  // ── Render helpers ─────────────────────────────────────────────────────────
  const renderCartItem = ({ item }) => {
    const unitPrice = safeNum(item.price) +
      (item.modifiers ?? []).reduce((s, m) => s + safeNum(m.price) * (m.qty ?? 1), 0);

    return (
      <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
        {/* Left: image + info */}
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
            {/* Feature 2: modifier chips */}
            <ModifierChips modifiers={item.modifiers} />
            <Text style={styles.itemPrice}>{unitPrice.toFixed(0)} ₴</Text>
          </View>
        </TouchableOpacity>

        {/* Right: quantity stepper — Feature 4 */}
        <View style={styles.stepper}>
          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() => handleDecrement(item)}
          >
            <Ionicons name="remove-circle" size={32} color={NEON} />
          </TouchableOpacity>

          <Text style={[styles.stepperQty, { color: theme.text }]}>{item.quantity}</Text>

          <TouchableOpacity
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            onPress={() =>
              dispatch(updateQuantity({ cartKey: item.cartKey, quantity: item.quantity + 1 }))
            }
          >
            <Ionicons name="add-circle" size={32} color={NEON} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const renderRecItem = ({ item }) => (
    <View style={[styles.recCard, { backgroundColor: theme.card }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setViewProduct(item)}>
        <Image source={{ uri: item.image }} style={styles.recImage} />
        <Text style={[styles.recName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={styles.recPrice}>{safeNum(item.price).toFixed(0)} ₴</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.recAddBtn}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        onPress={() => dispatch(addToCart({ ...item }))}
      >
        <Ionicons name="add" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {/* ── Header ── */}
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t(locale, 'cartTitle')}</Text>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <Text style={styles.clearBtn}>{t(locale, 'clearCart')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Delivery toggle ── */}
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
                  {type === 'delivery'
                    ? `🛵 ${t(locale, 'delivery')}`
                    : `🏃 ${t(locale, 'pickup')}`}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* ── Content ── */}
      {cartItems.length > 0 ? (
        <>
          <FlatList
            data={cartItems}
            renderItem={renderCartItem}
            keyExtractor={(item, idx) => item.cartKey ?? (resolveId(item) ?? idx).toString()}
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

          {/* ── Bottom Sheet ── */}
          <Animated.View
            style={[
              styles.sheet,
              {
                backgroundColor: theme.card,
                shadowColor: theme.text,
                height: EXPANDED_HEIGHT,
                transform: [
                  {
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
                  },
                ],
              },
            ]}
          >
            {/* Drag handle */}
            <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
              <View style={styles.dragPill} />
            </View>

            {/* ── COLLAPSED ZONE ── */}
            <View style={styles.collapsedZone}>
              {/* Feature 1: Delivery progress bar */}
              {deliveryType === 'delivery' && (
                <DeliveryProgressBar
                  progress={freeDeliveryProgress}
                  amountToFreeDelivery={amountToFreeDelivery}
                  locale={locale}
                  theme={theme}
                />
              )}

              {/* Total row — Feature 3: crossed-out when promo active */}
              <View style={styles.totalRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>
                  {t(locale, 'toPay')}
                </Text>
                <View style={styles.totalPriceGroup}>
                  {discountAmount > 0 && (
                    <Text style={styles.totalStrike}>
                      {originalTotal.toFixed(0)} ₴
                    </Text>
                  )}
                  <Text style={[styles.totalValue, { color: theme.text }]}>
                    {totalAmount.toFixed(0)} ₴
                  </Text>
                </View>
              </View>

              {/* Feature 1: Disabled checkout when min order not met */}
              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  !isMinOrderMet && styles.checkoutBtnDisabled,
                ]}
                activeOpacity={isMinOrderMet ? 0.85 : 1}
                onPress={handleCheckout}
                disabled={!isMinOrderMet}
              >
                <Text style={styles.checkoutBtnText}>
                  {isMinOrderMet
                    ? t(locale, 'placeOrder')
                    : (locale === 'en'
                      ? `Min. order ${MIN_ORDER_AMOUNT} ₴`
                      : `Мін. замовлення ${MIN_ORDER_AMOUNT} ₴`)}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── EXPANDED ZONE ── */}
            <View style={styles.expandedZone}>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Price breakdown */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: 'gray' }]}>{t(locale, 'goods')}</Text>
                {/* Feature 3: strike-through when promo applied */}
                {discountAmount > 0 ? (
                  <View style={styles.priceValueGroup}>
                    <Text style={styles.priceStrike}>{subtotal.toFixed(0)} ₴</Text>
                    <Text style={[styles.priceValue, { color: theme.text }]}>
                      {(subtotal - discountAmount).toFixed(0)} ₴
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.priceValue, { color: theme.text }]}>
                    {subtotal.toFixed(0)} ₴
                  </Text>
                )}
              </View>

              {deliveryType === 'delivery' && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: 'gray' }]}>
                    {t(locale, 'deliveryFee')}
                  </Text>
                  <Text style={[styles.priceValue, { color: theme.text }]}>
                    {deliveryFee === 0
                      ? locale === 'en' ? 'Free' : 'Безкоштовно'
                      : `${deliveryFee.toFixed(0)} ₴`}
                  </Text>
                </View>
              )}

              {appliedPromo && discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: NEON }]}>
                    {t(locale, 'discount')} ({appliedPromo.code})
                  </Text>
                  <Text style={[styles.priceValue, { color: NEON }]}>
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
                  <Ionicons name="ticket-outline" size={20} color={NEON} />
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
            <Text style={[styles.shopBtnText, { color: theme.text }]}>
              {locale === 'en' ? 'To menu' : 'В меню'}
            </Text>
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

      {/* Address picker */}
      <AddressBottomSheet
        visible={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
      />

      {/* Apple Pay modal */}
      <FakeApplePayModal
        visible={payModalVisible}
        amount={totalAmount.toFixed(0)}
        onClose={() => setPayModalVisible(false)}
        onPaymentSuccess={processActualCheckout}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 6,
  },
  headerTitle: { fontSize: 28, fontWeight: 'bold' },
  clearBtn: { color: '#ff3b30', fontWeight: '600', fontSize: 15 },
  headerPad: { paddingHorizontal: 20, paddingBottom: 10 },

  toggle: { flexDirection: 'row', borderRadius: 12, padding: 4, height: 44 },
  toggleBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  toggleText: { fontWeight: '600', color: 'gray' },
  toggleTextActive: { color: 'black' },

  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    padding: 12,
    borderRadius: 20,
    marginHorizontal: 16,
  },
  itemLeft: { flex: 1, flexDirection: 'row', alignItems: 'flex-start' },
  itemImage: { width: 66, height: 66, borderRadius: 16, backgroundColor: '#eee' },
  itemInfo: { flex: 1, marginLeft: 12 },
  itemName: { fontSize: 15, fontWeight: '700', lineHeight: 22 },
  itemPrice: { color: NEON, fontWeight: 'bold', marginTop: 4 },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperQty: { marginHorizontal: 10, fontSize: 18, fontWeight: 'bold' },

  recSection: { marginTop: 22, marginBottom: 20 },
  recTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  recCard: {
    width: 138,
    marginRight: 14,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    elevation: 2,
  },
  recImage: { width: 100, height: 78, borderRadius: 12, marginBottom: 7, backgroundColor: '#eee' },
  recName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  recPrice: { color: NEON, fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  recAddBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: NEON,
    borderRadius: 14,
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
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
  dragPill: { width: 44, height: 5, backgroundColor: '#C6C6CC', borderRadius: 3 },

  collapsedZone: { paddingBottom: 18 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  totalLabel: { fontSize: 17, fontWeight: '700' },
  totalPriceGroup: { alignItems: 'flex-end' },
  totalStrike: {
    fontSize: 13,
    color: 'gray',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  totalValue: { fontSize: 26, fontWeight: 'bold' },

  checkoutBtn: {
    backgroundColor: NEON,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#8a3f8a',
    opacity: 0.6,
  },
  checkoutBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },

  expandedZone: { flex: 1 },
  divider: { height: 1, marginBottom: 14, opacity: 0.35 },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  priceLabel: { fontSize: 15 },
  priceValueGroup: { alignItems: 'flex-end' },
  priceStrike: {
    fontSize: 12,
    color: 'gray',
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  priceValue: { fontSize: 15, fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    marginBottom: 9,
  },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center' },
  actionRowText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  changeText: { color: NEON, fontSize: 13, fontWeight: '600' },

  addNoteText: { color: NEON, fontWeight: 'bold', paddingVertical: 6 },
  noteBox: { borderRadius: 14, padding: 12 },
  noteInput: { fontSize: 14, maxHeight: 70, lineHeight: 20 },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 },

  modalBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  productSheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: 40,
    width: '100%',
    maxHeight: '82%',
  },
  productSheetPill: {
    width: 44,
    height: 5,
    backgroundColor: '#ccc',
    borderRadius: 3,
    alignSelf: 'center',
    marginTop: 12,
    marginBottom: 6,
  },
  productSheetImage: { width: '100%', height: 230, borderTopLeftRadius: 28, borderTopRightRadius: 28 },
  productSheetBody: { padding: 20 },
  productSheetTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  productSheetTitle: { fontSize: 22, fontWeight: 'bold', flex: 1, marginRight: 10 },
  productSheetPrice: { fontSize: 22, fontWeight: 'bold', color: NEON },
  productSheetDesc: { fontSize: 15, marginTop: 8, marginBottom: 24, lineHeight: 23 },
  productSheetBtn: {
    backgroundColor: NEON,
    padding: 16,
    borderRadius: 18,
    alignItems: 'center',
  },
  productSheetBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});