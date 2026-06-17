
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as Haptics from 'expo-haptics';
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
  RefreshControl,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setBottomBarVisible } from '../store/uiSlice';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import {
  tryAddToCart,
  clearCart,
  decrementItem,
  removeItem,
  updateQuantity,
  updateCartItemModifiers,
  selectCartSummary,
  setDeliveryType,
  setOrderNote,
  FREE_DELIVERY_THRESHOLD,
  MIN_ORDER_AMOUNT,
  formatPrice,
} from '../store/cartSlice';
import AddressBottomSheet from '../components/AddressBottomSheet';
import PromoSheet from '../components/PromoSheet';
import BackButton from '../components/BackButton';
import { fetchCatalog } from '../store/catalogSlice';
import useCheckoutFlow from '../hooks/useCheckoutFlow';
import CartItemExtrasSheet from '../components/CartItemExtrasSheet';
import ProductSheet from '../components/ProductSheet';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_DIAGONAL = Math.sqrt(SCREEN_WIDTH * SCREEN_WIDTH + SCREEN_HEIGHT * SCREEN_HEIGHT);
// Baseline diagonal is ~900 logical pixels. Clamped between 0.8 and 1.25.
const scale = Math.min(Math.max(SCREEN_DIAGONAL / 900, 0.8), 1.25);
const getScaled = (val) => Math.round(val * scale);

const COLLAPSED_HEIGHT = getScaled(200); // slightly taller to fit progress bar
const EXPANDED_HEIGHT = SCREEN_HEIGHT * 0.68;
const MAX_TRANS = EXPANDED_HEIGHT - COLLAPSED_HEIGHT;
const MIN_TRANS = 0;

const NEON = '#000000'; // fallback, replaced inline

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
            ? `${formatPrice(amountToFreeDelivery)} ₴ more for free delivery`
            : `Ще ${formatPrice(amountToFreeDelivery)} ₴ до безкоштовної доставки`)}
      </Text>
      <View style={[progressStyles.track, { backgroundColor: theme.input }]}>
        <Animated.View
          style={[
            progressStyles.fill,
            {
              backgroundColor: isFree ? '#22c55e' : theme.primary,
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
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  if (!modifiers || modifiers.length === 0) return null;
  return (
    <View style={chipStyles.row}>
      {modifiers.map((m, i) => (
        <View key={i} style={[chipStyles.chip, { borderColor: theme.primary, backgroundColor: `${theme.primary}10` }]}>
          <Text style={[chipStyles.text, { color: theme.primary }]}>
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: '#000000',
    borderRadius: 8,
    paddingHorizontal: 7,
    paddingVertical: 2,
    backgroundColor: 'rgba(227,52,227,0.08)',
  },
  text: { fontSize: 10, color: '#000000', fontWeight: '600' },
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

  const { initiateCheckout, processActualCheckout, isLoading } =
    useCheckoutFlow();

  const [addressSheetOpen, setAddressSheetOpen] = useState(false);
  const [noteVisible, setNoteVisible] = useState(false);
  const [extrasItem, setExtrasItem] = useState(null);
  const [viewProduct, setViewProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCatalog()).unwrap();
    } catch (error) {
      console.error('[Cart] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  // ── Redux state ────────────────────────────────────────────────────────────
  const cartItems = useSelector((s) => s.cart.items);
  const products = useSelector((s) => s.catalog.products);
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

  const hasWeightedItems = cartItems.some(i => i.pricingType === 'piece_variable');

  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const isOffline = useSelector((s) => s.ui?.isOffline ?? false);
  const paymentId = useSelector((s) => s.payment?.selectedMethodId);
  const paymentMethods = useSelector((s) => s.payment?.methods ?? []);
  const savedAddresses = useSelector((s) => s.auth?.addresses || []);
  const { currentLocation } = useSelector((s) => s.location);

  // ── Sort cart items: main dishes first, sauces/drinks at bottom ──────────
  const BOTTOM_CATEGORY_KEYWORDS = ['соус', 'sauce', 'напій', 'drink', 'кетчуп', 'кетч', 'вода', 'water', 'напо'];
  const isSideItem = (item) => {
    const cat = (item.category_name ?? item.categoryName ?? item.product_category ?? '').toLowerCase();
    return BOTTOM_CATEGORY_KEYWORDS.some(kw => cat.includes(kw));
  };
  const sortedCartItems = [...cartItems].sort((a, b) => {
    const aIsSide = isSideItem(a) ? 1 : 0;
    const bIsSide = isSideItem(b) ? 1 : 0;
    return aIsSide - bIsSide;
  });
  console.log('[cart.js] savedAddresses from auth:', JSON.stringify(savedAddresses, null, 2));

  const userAddress = currentLocation?.name
    ? `${currentLocation.name} (${currentLocation.addressName})`
    : (currentLocation?.addressName ||
       (savedAddresses?.length > 0 
         ? (savedAddresses[0].name ? `${savedAddresses[0].name} (${savedAddresses[0].address})` : savedAddresses[0].address)
         : t(locale, 'chooseAddressBtn')));
  const isAddressMissing = !savedAddresses || savedAddresses.length === 0;
  const activeMethod = paymentMethods.find((m) => m.id === paymentId);
  const paymentInfo = activeMethod
    ? { name: activeMethod.type, icon: activeMethod.icon }
    : { name: t(locale, 'choosePayment'), icon: 'card-outline' };

  const recommendations = products
    .filter((p) => {
      // Avoid recommending items already in the cart
      const isAlreadyInCart = cartItems.some((i) => resolveId(i) === p.product_id);
      if (isAlreadyInCart) return false;

      // Filter recommendations by the restaurant currently in the cart
      if (cartItems.length > 0) {
        const currentStoreId = Number(cartItems[0].store_id || cartItems[0].restaurantId);
        const productStoreId = Number(p.store_id || p.restaurantId);
        return currentStoreId === productStoreId;
      }
      return true;
    })
    .slice(0, 6);

  // ── Bottom sheet animation ─────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(MAX_TRANS)).current;
  const currentY = useRef(MAX_TRANS);
  const startY = useRef(MAX_TRANS);

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

  const activeScale = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(activeScale, { toValue: 1.35, friction: 8, tension: 60, useNativeDriver: true }).start();
  };

  const handlePressOut = () => {
    Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
  };

  const snapTo = useCallback(
    (toValue) => {
      if (toValue === MIN_TRANS) {
        dispatch(setBottomBarVisible(false));
      } else {
        dispatch(setBottomBarVisible(true));
      }
      Animated.timing(translateY, {
        toValue,
        duration: 420,
        easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
        useNativeDriver: true,
      }).start();
    },
    [translateY, dispatch]
  );

  const toggleCartSheet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    const target = currentY.current > MAX_TRANS / 2 ? MIN_TRANS : MAX_TRANS;
    snapTo(target);
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationY } = evt.nativeEvent;
        return locationY < 48;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        if (!isVertical) return false;

        const { locationY } = evt.nativeEvent;
        return locationY < 48 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        startY.current = currentY.current;
        translateY.extractOffset();
        Animated.spring(activeScale, { toValue: 1.35, friction: 8, tension: 60, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gs) => {
        let dy = gs.dy;
        const projected = startY.current + dy;
        if (projected < MIN_TRANS) {
          dy = (MIN_TRANS - startY.current) + (projected - MIN_TRANS) * 0.25;
        } else if (projected > MAX_TRANS) {
          dy = (MAX_TRANS - startY.current) + (projected - MAX_TRANS) * 0.25;
        }
        translateY.setValue(dy);
      },
      onPanResponderRelease: (_, gs) => {
        translateY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
        const cy = translateY._value;
        const vy = gs.vy;
        let target;
        if (vy > 0.4) target = MAX_TRANS;
        else if (vy < -0.4) target = MIN_TRANS;
        else target = cy < MAX_TRANS * 0.5 ? MIN_TRANS : MAX_TRANS;
        snapTo(target);
      },
      onPanResponderTerminate: () => {
        translateY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
        snapTo(currentY.current > MAX_TRANS / 2 ? MAX_TRANS : MIN_TRANS);
      },
    })
  ).current;

  // ── Checkout ───────────────────────────────────────────────────────────────
  const handleCheckout = () => {
    console.log('[cart.js] handleCheckout pressed. isMinOrderMet:', isMinOrderMet, 'isOffline:', isOffline);
    if (!isMinOrderMet || isOffline) return; // guard — button is also visually disabled
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    initiateCheckout();
  };

  // ── Feature 4: Safe decrement with Alert────────────────────────────────────
  const handleDecrement = useCallback(
    (item) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
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
    const pricingType = item.pricingType ?? 'piece';
    const weightStep = item.weightStep ?? 100;
    const avgWeight = item.averageWeight ?? item.weightGrams ?? 350;

    let baseUnitPrice = safeNum(item.price);
    let displayQty = item.quantity;
    let priceSubLabel = '';

    if (pricingType === 'weight_step') {
      priceSubLabel = `/ ${weightStep}г`;
      displayQty = `${item.quantity * weightStep}г`;
    } else if (pricingType === 'piece_variable') {
      baseUnitPrice = baseUnitPrice * (avgWeight / 100);
      priceSubLabel = `/ шт`;
      displayQty = `${item.quantity} шт`;
    }

    const modifiers = item.modifiers ?? [];
    const modsTotal = modifiers.reduce((s, m) => s + safeNum(m.price) * (m.qty ?? 1), 0);
    const unitPrice = baseUnitPrice + modsTotal;
    const lineTotal = unitPrice * item.quantity;

    return (
      <TouchableOpacity
        style={[styles.itemCard, { backgroundColor: theme.card }]}
        activeOpacity={0.92}
        onPress={() => setExtrasItem(item)}
      >
        {/* Top row: image + name + stepper */}
        <View style={styles.itemTopRow}>
          <Image source={{ uri: item.image }} style={styles.itemImage} />
          <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          {/* Quantity stepper — top right */}
          <View style={styles.stepper}>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              onPress={(e) => { e.stopPropagation?.(); handleDecrement(item); }}
            >
              <Ionicons name="remove-circle" size={getScaled(30)} color={theme.primary} />
            </TouchableOpacity>
            <Text style={[styles.stepperQty, { color: theme.text }]}>{displayQty}</Text>
            <TouchableOpacity
              hitSlop={{ top: 12, bottom: 12, left: 10, right: 10 }}
              onPress={(e) => {
                e.stopPropagation?.();
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                dispatch(updateQuantity({ cartKey: item.cartKey, quantity: item.quantity + 1 }));
              }}
            >
              <Ionicons name="add-circle" size={getScaled(30)} color={theme.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Modifiers as line rows */}
        {modifiers.length > 0 && (
          <View style={styles.modifierRows}>
            {modifiers.map((mod, idx) => (
              <View key={`${mod.id}-${idx}`} style={styles.modifierRow}>
                <Text style={[styles.modifierRowName, { color: theme.textSecondary ?? 'gray' }]}>
                  {mod.name} <Text style={{ opacity: 0.6 }}>x{mod.qty ?? 1}</Text>
                </Text>
                <Text style={[styles.modifierRowPrice, { color: theme.textSecondary ?? 'gray' }]}>
                  {formatPrice(safeNum(mod.price) * (mod.qty ?? 1))} ₴
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Загалом row */}
        <View style={styles.itemTotalRow}>
          <Text style={[styles.itemTotalLabel, { color: theme.primary }]}>Загалом</Text>
          <Text style={[styles.itemTotalValue, { color: theme.primary }]}>
            {formatPrice(lineTotal)} ₴{priceSubLabel ? ` ${priceSubLabel}` : ''}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  const renderRecItem = ({ item }) => (
    <View style={[styles.recCard, { backgroundColor: theme.card }]}>
      <TouchableOpacity activeOpacity={0.8} onPress={() => setViewProduct(item)}>
        <Image source={{ uri: item.image }} style={styles.recImage} />
        <Text style={[styles.recName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <Text style={[styles.recPrice, { color: theme.primary }]}>{formatPrice(safeNum(item.price))} ₴</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.recAddBtn, { backgroundColor: theme.primary }]}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          dispatch(tryAddToCart({ ...item }));
        }}
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
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <BackButton />
          <Text style={[styles.headerTitle, { color: theme.text, marginLeft: 8 }]}>{t(locale, 'cartTitle')}</Text>
        </View>
        {cartItems.length > 0 && (
          <TouchableOpacity onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            Alert.alert(
              locale === 'en' ? 'Clear cart?' : 'Очистити кошик?',
              locale === 'en'
                ? 'Are you sure you want to remove all items from your cart?'
                : 'Ви впевнені, що хочете видалити всі товари з кошика?',
              [
                { text: locale === 'en' ? 'Cancel' : 'Скасувати', style: 'cancel' },
                {
                  text: locale === 'en' ? 'Clear' : 'Очистити',
                  style: 'destructive',
                  onPress: () => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
                    dispatch(clearCart());
                  },
                },
              ]
            );
          }}>
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
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  dispatch(setDeliveryType(type));
                }}
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
            onScroll={handleScroll}
            scrollEventThrottle={16}
            data={sortedCartItems}
            renderItem={renderCartItem}
            keyExtractor={(item, idx) => item.cartKey ?? (resolveId(item) ?? idx).toString()}
            contentContainerStyle={{
              paddingTop: 10,
              paddingBottom: COLLAPSED_HEIGHT + insets.bottom + 32,
            }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={theme.primary}
                colors={[theme.primary]}
              />
            }
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
            {...panResponder.panHandlers}
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
            <TouchableOpacity
              activeOpacity={1}
              onPress={toggleCartSheet}
              onPressIn={handlePressIn}
              onPressOut={handlePressOut}
              style={styles.dragHandleArea}
            >
              <Animated.View
                style={[
                  styles.dragPill,
                  {
                    transform: [
                      { scaleX: activeScale },
                      { scaleY: activeScale }
                    ]
                  }
                ]}
              />
            </TouchableOpacity>

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
                      {formatPrice(originalTotal)} ₴
                    </Text>
                  )}
                  <Text style={[styles.totalValue, { color: theme.text }]}>
                    {formatPrice(totalAmount)} ₴
                  </Text>
                </View>
              </View>

              {/* Feature 1: Disabled checkout when min order not met or offline */}
              <TouchableOpacity
                style={[
                  styles.checkoutBtn,
                  { backgroundColor: theme.primary },
                  (!isMinOrderMet || isLoading || isOffline) && styles.checkoutBtnDisabled,
                ]}
                activeOpacity={isMinOrderMet && !isLoading && !isOffline ? 0.85 : 1}
                onPress={handleCheckout}
                disabled={!isMinOrderMet || isLoading || isOffline}
              >
                <Text style={styles.checkoutBtnText}>
                  {isOffline
                    ? (locale === 'en' ? 'Offline Mode' : 'Офлайн-режим')
                    : (isLoading
                      ? (locale === 'en' ? 'Processing...' : 'Обробка...')
                      : (isMinOrderMet
                        ? t(locale, 'placeOrder')
                        : (locale === 'en'
                          ? `Min. order ${MIN_ORDER_AMOUNT} ₴`
                          : `Мін. замовлення ${MIN_ORDER_AMOUNT} ₴`)))}
                </Text>
              </TouchableOpacity>
            </View>

            {/* ── EXPANDED ZONE ── */}
            <View style={styles.expandedZone}>
              {hasWeightedItems && (
                <View style={[styles.weightWarningBox, { backgroundColor: theme.input }]}>
                  <Ionicons name="information-circle-outline" size={16} color={theme.primary} />
                  <Text style={[styles.weightWarningText, { color: theme.textSecondary }]}>
                    {locale === 'en'
                      ? '*Actual cost of steak/fish will be calculated after weighing.'
                      : '*Точна вартість стейків/риби буде визначена після зважування.'}
                  </Text>
                </View>
              )}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />

              {/* Price breakdown */}
              <View style={styles.priceRow}>
                <Text style={[styles.priceLabel, { color: 'gray' }]}>{t(locale, 'goods')}</Text>
                {/* Feature 3: strike-through when promo applied */}
                {discountAmount > 0 ? (
                  <View style={styles.priceValueGroup}>
                    <Text style={styles.priceStrike}>{formatPrice(subtotal)} ₴</Text>
                    <Text style={[styles.priceValue, { color: theme.text }]}>
                      {formatPrice(subtotal - discountAmount)} ₴
                    </Text>
                  </View>
                ) : (
                  <Text style={[styles.priceValue, { color: theme.text }]}>
                    {formatPrice(subtotal)} ₴
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
                      : `${formatPrice(deliveryFee)} ₴`}
                  </Text>
                </View>
              )}

              {appliedPromo && discountAmount > 0 && (
                <View style={styles.priceRow}>
                  <Text style={[styles.priceLabel, { color: NEON }]}>
                    {t(locale, 'discount')} ({appliedPromo.code})
                  </Text>
                  <Text style={[styles.priceValue, { color: NEON }]}>
                    −{formatPrice(discountAmount)} ₴
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
                  <Ionicons name="ticket-outline" size={20} color={theme.primary} />
                  <Text style={[styles.actionRowText, { color: theme.text }]}>
                    {appliedPromo ? appliedPromo.code : t(locale, 'promoCode')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="gray" />
              </TouchableOpacity>

              {/* Address row (delivery only) */}
              {deliveryType === 'delivery' && (
                isAddressMissing ? (
                  <TouchableOpacity
                    style={[styles.checkoutBtn, { backgroundColor: theme.primary, marginBottom: 12, borderStyle: 'dashed', borderWidth: 1, borderColor: 'white' }]}
                    activeOpacity={0.8}
                    onPress={() => router.push('/location-picker')}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                      <Ionicons name="add-circle" size={22} color="white" style={{ marginRight: 10 }} />
                      <Text style={styles.checkoutBtnText}>{t(locale, 'addNewAddress')}</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
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
                    <Text style={[styles.changeText, { color: theme.primary }]}>{t(locale, 'change')}</Text>
                  </TouchableOpacity>
                )
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
              <View style={{ marginTop: getScaled(6), paddingBottom: insets.bottom + getScaled(12) }}>
                {!noteVisible && !orderNote ? (
                  <TouchableOpacity
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    onPress={() => {
                      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
                      setNoteVisible(true);
                    }}
                  >
                    <Text style={[styles.addNoteText, { color: theme.primary }]}>{t(locale, 'addComment')}</Text>
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
            onPress={() => router.push('/home')}
          >
            <Text style={[styles.shopBtnText, { color: theme.text }]}>
              {locale === 'en' ? 'To menu' : 'В меню'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── Cart Item Extras Sheet ── */}
      <CartItemExtrasSheet
        visible={!!extrasItem}
        item={extrasItem}
        catalogProduct={
          extrasItem
            ? products.find(p => p.product_id === (extrasItem.product_id ?? extrasItem.id))
            : null
        }
        onClose={() => setExtrasItem(null)}
      />

      {viewProduct && (
        <ProductSheet
          product={viewProduct}
          onClose={() => setViewProduct(null)}
        />
      )}

      {/* Address picker */}
      <AddressBottomSheet
        visible={addressSheetOpen}
        onClose={() => setAddressSheetOpen(false)}
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
    marginBottom: getScaled(12),
    padding: getScaled(12),
    borderRadius: getScaled(20),
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  itemTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemImage: { width: getScaled(56), height: getScaled(56), borderRadius: getScaled(14), backgroundColor: '#eee' },
  itemName: { flex: 1, fontSize: getScaled(15), fontWeight: '700', lineHeight: getScaled(22), marginHorizontal: 10 },
  modifierRows: {
    marginLeft: getScaled(56) + 10,
    marginTop: 4,
    marginBottom: 2,
  },
  modifierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  modifierRowName: {
    fontSize: getScaled(12),
    flex: 1,
    marginRight: 8,
  },
  modifierRowPrice: {
    fontSize: getScaled(12),
    fontWeight: '600',
  },
  itemTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    marginLeft: getScaled(56) + 10,
  },
  itemTotalLabel: {
    fontSize: getScaled(14),
    fontWeight: '700',
  },
  itemTotalValue: {
    fontSize: getScaled(14),
    fontWeight: '700',
  },

  stepper: { flexDirection: 'row', alignItems: 'center' },
  stepperQty: { marginHorizontal: getScaled(6), fontSize: getScaled(14), fontWeight: 'bold', minWidth: getScaled(24), textAlign: 'center' },

  recSection: { marginTop: 22, marginBottom: 20 },
  recTitle: { fontSize: 18, fontWeight: 'bold', marginLeft: 16, marginBottom: 12 },
  recCard: {
    width: 138,
    marginRight: 14,
    borderRadius: 16,
    padding: 10,
    alignItems: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 }
    })
  },
  recImage: { width: 100, height: 78, borderRadius: 12, marginBottom: 7, backgroundColor: '#eee' },
  recName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 2 },
  recPrice: { color: '#000000', fontWeight: 'bold', fontSize: 12, marginBottom: 4 },
  recAddBtn: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    backgroundColor: '#000000',
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
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  dragHandleArea: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginHorizontal: -20,
    paddingHorizontal: 20,
    backgroundColor: 'transparent',
  },
  dragPill: { width: 48, height: 5, backgroundColor: '#C6C6CC', borderRadius: 2.5 },

  collapsedZone: { paddingBottom: 18 },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: getScaled(14),
  },
  totalLabel: { fontSize: getScaled(17), fontWeight: '700' },
  totalPriceGroup: { alignItems: 'flex-end' },
  totalStrike: {
    fontSize: getScaled(13),
    color: 'gray',
    textDecorationLine: 'line-through',
    marginBottom: 2,
  },
  totalValue: { fontSize: getScaled(26), fontWeight: 'bold' },

  checkoutBtn: {
    backgroundColor: '#000000',
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
  },
  checkoutBtnDisabled: {
    backgroundColor: '#8a3f8a',
    opacity: 0.6,
  },
  checkoutBtnText: { color: 'white', fontSize: getScaled(16), fontWeight: 'bold' },

  expandedZone: { flex: 1 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 14, opacity: 0.2, backgroundColor: 'rgba(0,0,0,0.1)' },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 9,
  },
  priceLabel: { fontSize: getScaled(15) },
  priceValueGroup: { alignItems: 'flex-end' },
  priceStrike: {
    fontSize: getScaled(12),
    color: 'gray',
    textDecorationLine: 'line-through',
    marginBottom: 1,
  },
  priceValue: { fontSize: getScaled(15), fontWeight: '600' },

  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 13,
    borderRadius: 14,
    marginBottom: 9,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  actionRowLeft: { flexDirection: 'row', alignItems: 'center' },
  actionRowText: { fontSize: 14, fontWeight: '600', marginLeft: 10 },
  changeText: { color: '#000000', fontSize: 13, fontWeight: '600' },

  addNoteText: { color: '#000000', fontWeight: 'bold', paddingVertical: getScaled(6) },
  noteBox: { borderRadius: getScaled(14), padding: getScaled(12) },
  noteInput: { fontSize: getScaled(14), maxHeight: getScaled(70), lineHeight: getScaled(20), paddingVertical: 0, textAlignVertical: 'top' },

  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 14 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 },



  weightWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 11,
    borderRadius: 12,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  weightWarningText: {
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});