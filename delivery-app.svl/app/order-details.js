import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, Alert,
  StyleSheet, Animated, Easing, Dimensions, Linking, Platform, BackHandler
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { HubConnectionBuilder, HttpTransportType } from '@microsoft/signalr';
import { getToken } from '../src/api/client';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../utils/dateUtils';
import { t } from '../constants/translations';
import { fetchOrderDetails, confirmOrder, updateOrderStatus } from '../store/ordersSlice';
import { formatPrice } from '../store/cartSlice';
import * as Haptics from 'expo-haptics';
import { restaurantCancelDelivery } from '../src/api';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { safeBack } from '../utils/navigation';
import { syncLiveActivity, endActivity, startPolling, stopPolling } from '../services/LiveActivityService';
import { hs, vs, ms, fs, r, hairline } from '../utils/responsive';
import BackButton from '../components/BackButton';
import PaymentRetryCard, { isPaidStatus } from '../components/PaymentRetryCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────────────────────────
// Premium Config & Helpers
// ──────────────────────────────────────────────────────────────
const MAGENTA = '#000000'; // updated statically, but inline uses dynamic theme.primary
const NEON_BLUE = '#34C759';

// Status config aligned with backend DeliveryStatus enum 0-6
const STATUS_CONFIG = {
  0: { key: 'created', icon: 'receipt', color: '#8e44ad', titleEn: 'Ordered', titleUk: 'Оформлено', lottie: '📝' },
  1: { key: 'accepted', icon: 'checkmark-circle', color: '#2ecc71', titleEn: 'Confirmed', titleUk: 'Підтверджено', lottie: '✅' },
  2: { key: 'preparing', icon: 'flame', color: '#f39c12', titleEn: 'Cooking', titleUk: 'Готується', lottie: '👨‍🍳' },
  3: { key: 'ready_for_pickup', icon: 'cube', color: '#f39c12', titleEn: 'Ready', titleUk: 'Готово до видачі', lottie: '📦' },
  4: { key: 'delivering', icon: 'bicycle', color: '#3498db', titleEn: 'Delivering', titleUk: 'Хутко мчить', lottie: '🛵' },
  5: { key: 'delivered', icon: 'home', color: '#2ecc71', titleEn: 'Delivered', titleUk: 'Доставлено', lottie: '🎉' },
  6: { key: 'canceled', icon: 'close-circle', color: '#e74c3c', titleEn: 'Canceled', titleUk: 'Скасовано', lottie: '❌' },
};

function statusToStep(status) {
  const s = String(status).toLowerCase();
  if (s === '6' || s === 'canceled' || s === 'cancelled') return 6;
  if (s === '5' || s === 'delivered' || s === 'completed') return 5;
  if (s === '4' || s === 'picked_up' || s === 'delivering') return 4;
  if (s === '3' || s === 'ready_for_pickup' || s === 'ready') return 3;
  if (s === '2' || s === 'preparing') return 2;
  if (s === '1' || s === 'accepted') return 1;
  return 0;
}

const SUPPORT_CONFIG = {
  telegram: 'mur_zik8',
  viber: '+380991300002'
};

const safeNumber = (val, fallback = 0) => {
  if (val === null || val === undefined) return fallback;
  const parsed = Number(val);
  return isNaN(parsed) ? fallback : parsed;
};

const OrderItem = React.memo(({ item, theme, locale }) => {
  const quantity = safeNumber(item.quantity, 1);
  const actualWeight = item.actualWeight ? safeNumber(item.actualWeight) : null;
  const weightStep = item.weightStep ? safeNumber(item.weightStep) : null;
  const pricingType = item.pricingType ?? 'piece';

  let qtyText = `${quantity}x`;
  let weightDetail = '';

  if (pricingType === 'weight_step' && weightStep) {
    qtyText = `${quantity * weightStep}г`;
  } else if (actualWeight) {
    weightDetail = `(${actualWeight}г)`;
  } else if (pricingType === 'piece_variable' && item.averageWeight) {
    weightDetail = `(≈ ${item.averageWeight}г)`;
  }

  return (
    <View style={[styles.itemRowWrapper, { backgroundColor: theme.background }]}>
      <View style={[styles.itemQtyBadge, { backgroundColor: theme.input }]}>
        <Text style={[styles.itemQtyText, { color: theme.primary, fontSize: qtyText.length > 3 ? 11 : 15 }]}>{qtyText}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemNameText, { color: theme.text }]} numberOfLines={2}>
          {item.productName || item.name || 'Товар'}
        </Text>
        {weightDetail ? (
          <Text style={{ fontSize: 12, color: 'gray', marginTop: 2 }}>{weightDetail}</Text>
        ) : null}
      </View>
      <Text style={[styles.itemPriceText, { color: theme.text }]}>
        {formatPrice(
          item.totalLineAmount !== undefined && item.totalLineAmount !== null 
            ? safeNumber(item.totalLineAmount) 
            : (safeNumber(item.price) * quantity)
        )} ₴
      </Text>
    </View>
  );
});

// ──────────────────────────────────────────────────────────────
// Animated Progress Bar (Horizontal)
// ──────────────────────────────────────────────────────────────
function HorizontalProgressBar({ currentStep, theme }) {
  // Key steps to show in the compact top bar
  const mainSteps = [0, 1, 3, 5, 6];
  const activeMainIndex = mainSteps.reduce((acc, step, idx) => (currentStep >= step ? idx : acc), 0);

  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, easing: Easing.inOut(Easing.ease), useNativeDriver: true })
      ])
    ).start();
  }, [pulseAnim]);

  return (
    <View style={progressStyles.container}>
      {mainSteps.map((stepNum, index) => {
        const isActive = currentStep >= stepNum;
        const isCurrent = activeMainIndex === index;
        const config = STATUS_CONFIG[stepNum];

        return (
          <React.Fragment key={`prog-${stepNum}`}>
            <View style={progressStyles.stepWrapper}>
              {isCurrent ? (
                <Animated.View style={[progressStyles.iconCircle, { backgroundColor: config.color, transform: [{ scale: pulseAnim }], shadowColor: config.color, shadowOpacity: 0.6, shadowRadius: 8, elevation: 5 }]}>
                  <Ionicons name={config.icon} size={16} color="white" />
                </Animated.View>
              ) : (
                <View style={[progressStyles.iconCircle, { backgroundColor: isActive ? config.color : theme.border }]}>
                  <Ionicons name={config.icon} size={16} color={isActive ? "white" : "gray"} />
                </View>
              )}
            </View>
            {index < mainSteps.length - 1 && (
              <View style={[progressStyles.line, { backgroundColor: index < activeMainIndex ? config.color : theme.border }]} />
            )}
          </React.Fragment>
        );
      })}
    </View>
  );
}

const progressStyles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: vs(20),
  },
  stepWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    width: ms(36),
    height: ms(36),
  },
  iconCircle: {
    width: ms(32),
    height: ms(32),
    borderRadius: r(16),
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: { flex: 1, height: vs(3), marginHorizontal: hs(4), borderRadius: r(2) },
});

// ──────────────────────────────────────────────────────────────
// Premium Order Details Screen
// ──────────────────────────────────────────────────────────────
export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const insets = useSafeAreaInsets();
  const intervalRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [liveCourierCoords, setLiveCourierCoords] = useState(null);
  const [hasRealSignalRCoords, setHasRealSignalRCoords] = useState(false);
  const mapRef = useRef(null);
  const lastRouteFetchedCoords = useRef({ startLat: null, startLng: null, endLat: null, endLng: null });
  const hasFittedMap = useRef({ withCourier: false, withoutCourier: false });

  // Reset state when order ID changes
  useEffect(() => {
    setLiveCourierCoords(null);
    setHasRealSignalRCoords(false);
    setRouteCoords([]);
    lastRouteFetchedCoords.current = { startLat: null, startLng: null, endLat: null, endLng: null };
    hasFittedMap.current = { withCourier: false, withoutCourier: false };
  }, [id]);

  const order = useSelector(state =>
    state.orders.orders.find(o => String(o.deliveryId || o.id) === String(id))
  );

  const hasWeightedItems = useMemo(() => 
    order?.items?.some(i => i.pricingType === 'piece_variable') ?? false
  , [order?.items]);

  const isFullyWeighed = useMemo(() => 
    hasWeightedItems && (order?.items?.filter(i => i.pricingType === 'piece_variable').every(i => i.actualWeight > 0) ?? false)
  , [hasWeightedItems, order?.items]);

  const activeStatus = order?.statusDelivery ?? order?.status ?? 'created';
  const currentStep = statusToStep(activeStatus);
  const courierName = order?.courierName || (
    currentStep === 5 
      ? (locale === 'en' ? 'Not specified' : 'Не вказано') 
      : currentStep === 6 
      ? (locale === 'en' ? 'Not assigned' : 'Не призначений') 
      : (locale === 'en' ? 'Searching...' : 'Шукаємо кур\'єра...')
  );
  const courierRating = order?.courierRating;
  const courierPhone = order?.courierPhone;
  const courierPhoto = order?.courierPhoto;

  const [routeCoords, setRouteCoords] = useState([]);

  // Animate map to show restaurant/courier and customer pin (only fit once per status condition to prevent jumping)
  useEffect(() => {
    if (mapRef.current) {
      const points = [];
      const hasCourier = !!(liveCourierCoords?.latitude && liveCourierCoords?.longitude);
      
      // Prevent repeated map jumping on every GPS update
      if (hasCourier && hasFittedMap.current.withCourier) return;
      if (!hasCourier && hasFittedMap.current.withoutCourier) return;

      if (order?.customerLatitude && order?.customerLongitude) {
        points.push({ latitude: order.customerLatitude, longitude: order.customerLongitude });
      }
      if (hasCourier) {
        points.push({ latitude: liveCourierCoords.latitude, longitude: liveCourierCoords.longitude });
      } else if (order?.restaurantLatitude && order?.restaurantLongitude) {
        points.push({ latitude: order.restaurantLatitude, longitude: order.restaurantLongitude });
      }

      if (points.length >= 2) {
        console.log('📡 [OrderDetails] fitToCoordinates on map:', points);
        const timer = setTimeout(() => {
          mapRef.current?.fitToCoordinates(points, {
            edgePadding: { top: 70, right: 70, bottom: 70, left: 70 },
            animated: true,
          });
          if (hasCourier) {
            hasFittedMap.current.withCourier = true;
          } else {
            hasFittedMap.current.withoutCourier = true;
          }
        }, 300);
        return () => clearTimeout(timer);
      }
    }
  }, [
    liveCourierCoords?.latitude,
    liveCourierCoords?.longitude,
    order?.restaurantLatitude,
    order?.restaurantLongitude,
    order?.customerLatitude,
    order?.customerLongitude
  ]);

  // Fetch precise route using OSRM
  useEffect(() => {
    let active = true;
    const fetchRoute = async () => {
      const startLat = liveCourierCoords?.latitude || order?.restaurantLatitude;
      const startLng = liveCourierCoords?.longitude || order?.restaurantLongitude;
      const endLat = order?.customerLatitude;
      const endLng = order?.customerLongitude;

      if (!startLat || !startLng || !endLat || !endLng) {
        console.log('📡 [OrderDetails] OSRM route skipped: missing coordinates');
        return;
      }

      // Check if coordinates are the same as last fetched to prevent spamming
      const last = lastRouteFetchedCoords.current;
      if (
        last.startLat === startLat &&
        last.startLng === startLng &&
        last.endLat === endLat &&
        last.endLng === endLng
      ) {
        console.log('📡 [OrderDetails] OSRM route skipped: coordinates unchanged');
        return;
      }

      try {
        const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
        console.log('📡 [OrderDetails] Fetching route from OSRM:', url);
        const res = await fetch(url);
        const data = await res.json();
        if (active && data.routes && data.routes.length > 0) {
          const coords = data.routes[0].geometry.coordinates.map(c => ({
            latitude: c[1],
            longitude: c[0]
          }));
          console.log('📡 [OrderDetails] Route coordinates fetched successfully:', coords.length);
          setRouteCoords(coords);
          // Update ref
          lastRouteFetchedCoords.current = { startLat, startLng, endLat, endLng };
        } else {
          console.warn('📡 [OrderDetails] OSRM returned empty routes');
        }
      } catch (err) {
        console.warn('[OrderDetails] Failed to fetch precise route:', err);
      }
    };

    fetchRoute();
    return () => {
      active = false;
    };
  }, [
    liveCourierCoords?.latitude,
    liveCourierCoords?.longitude,
    order?.restaurantLatitude,
    order?.restaurantLongitude,
    order?.customerLatitude,
    order?.customerLongitude
  ]);

  // 1. SignalR Subscription for Real-time Courier tracking
  useEffect(() => {
    const orderIdNum = parseInt(id, 10);
    if (isNaN(orderIdNum)) return;

    let connection = null;
    let isMounted = true;

    const startSignalR = async () => {
      try {
        const token = await getToken();
        if (!token) return;
        if (!isMounted) return;

        // Force WebSockets transport to prevent fallback to ServerSentEvents (which fails in React Native due to missing EventSource)
        connection = new HubConnectionBuilder()
          .withUrl("https://api.andi.delivery/trackingHub", {
            accessTokenFactory: () => token,
            transport: HttpTransportType.WebSockets
          })
          .withAutomaticReconnect()
          .build();

        // Custom timeout values to tolerate temporary network pauses
        connection.serverTimeoutInMilliseconds = 60000;
        connection.keepAliveIntervalInMilliseconds = 15000;

        connection.on("ReceiveLocation", (data) => {
          console.log('📡 [SignalR User] ReceiveLocation:', data);
          if (data) {
            // Support multiple latitude/longitude naming conventions from backend
            const lat = data.latitude ?? data.lat ?? data.Latitude;
            const lng = data.longitude ?? data.lng ?? data.Longitude;
            
            if (lat !== undefined && lng !== undefined && Number(lat) > 0 && Number(lng) > 0) {
              setLiveCourierCoords({
                latitude: Number(lat),
                longitude: Number(lng),
              });
              setHasRealSignalRCoords(true);
            } else {
              console.warn('⚠️ [SignalR User] Ignored invalid coordinates:', data);
            }
          }
        });

        connection.onclose((error) => {
          console.log('🔌 [SignalR User] Connection closed:', error);
        });

        connection.onreconnecting((error) => {
          console.warn('🔌 [SignalR User] Connection lost. Reconnecting...', error);
        });

        connection.onreconnected((connectionId) => {
          console.log('🔌 [SignalR User] Reconnected successfully. Re-joining group for order:', orderIdNum);
          if (isMounted) {
            connection.invoke("JoinOrderGroup", orderIdNum)
              .then(() => console.log(`🔌 [SignalR User] Re-joined order group: order_${orderIdNum}`))
              .catch(err => {
                if (isMounted) console.error('🔌 [SignalR User] Re-join group failed:', err);
              });
          }
        });

        await connection.start();
        if (!isMounted) {
          connection.stop();
          return;
        }
        console.log('🔌 [SignalR User] Connected successfully');

        await connection.invoke("JoinOrderGroup", orderIdNum);
        console.log(`🔌 [SignalR User] Joined order group: order_${orderIdNum}`);
      } catch (err) {
        if (isMounted) {
          console.error('❌ [SignalR User] Connection error:', err);
        } else {
          console.log('🔌 [SignalR User] Connection attempt aborted/stopped on unmount');
        }
      }
    };

    startSignalR();

    return () => {
      isMounted = false;
      if (connection) {
        connection.stop()
          .then(() => console.log('🔌 [SignalR User] Connection stopped'))
          .catch(err => console.warn('🔌 [SignalR User] Error stopping connection:', err));
      }
    };
  }, [id]);

  // 2. Fallback logic for courier location on map (no fake simulation, no fake restLat fallback for courier)
  useEffect(() => {
    if (!order) return;

    // If we have received real coords from SignalR, do not overwrite them
    if (hasRealSignalRCoords) return;

    // Use initial REST API courier coordinates if they exist and are valid (> 0)
    if (order.courierLatitude > 0 && order.courierLongitude > 0) {
      setLiveCourierCoords({
        latitude: order.courierLatitude,
        longitude: order.courierLongitude,
      });
    } else {
      // Clean up coordinates if they are invalid or not provided
      setLiveCourierCoords(null);
    }
  }, [
    order?.courierLatitude, 
    order?.courierLongitude, 
    hasRealSignalRCoords
  ]);


  useFocusEffect(
    React.useCallback(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      if (!id) return;

      const fetchAndSync = async () => {
        try {
          const result = await dispatch(fetchOrderDetails(id));
          return result?.payload;
        } catch (e) {
          console.warn('[OrderDetails] fetch failed:', e);
        }
      };

      // Fetch immediately on focus
      fetchAndSync();

      // Poll every 5 seconds for live status and courier updates
      const interval = setInterval(fetchAndSync, 5000);

      // Keep startPolling fallback if needed
      startPolling(id, fetchAndSync);

      return () => {
        clearInterval(interval);
      };
    }, [id, dispatch])
  );

  if (!order) {
    return (
      <SafeAreaView edges={['top']} style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{t(locale, 'orderNotFound')}</Text>
        <BackButton color={theme.text} />
      </SafeAreaView>
    );
  }
  const statusDef = STATUS_CONFIG[currentStep] || STATUS_CONFIG[0];

  const [isConfirming, setIsConfirming] = useState(false);

  const isOnlinePayment = useCallback((method) => {
    if (!method) return true; // default to card (user stated app is card only)
    const m = String(method).toLowerCase();
    if (m.includes('cash') || m.includes('готівк') || m === '1') {
      return false;
    }
    return true;
  }, []);

  const restaurantMarker = useMemo(() => {
    if (!order?.restaurantLatitude || !order?.restaurantLongitude) return null;
    return (
      <Marker
        coordinate={{
          latitude: order.restaurantLatitude,
          longitude: order.restaurantLongitude,
        }}
        title={locale === 'en' ? 'Restaurant' : 'Ресторан'}
      >
        <View style={[styles.mapPin, { backgroundColor: theme.primary }]}>
          <Ionicons name="restaurant" size={14} color="white" />
        </View>
      </Marker>
    );
  }, [order?.restaurantLatitude, order?.restaurantLongitude, locale, theme.primary]);

  const courierMarker = useMemo(() => {
    if (!liveCourierCoords?.latitude || !liveCourierCoords?.longitude) return null;
    return (
      <Marker
        coordinate={{
          latitude: liveCourierCoords.latitude,
          longitude: liveCourierCoords.longitude,
        }}
        title={locale === 'en' ? 'Courier' : 'Кур\'єр'}
      >
        <View style={[styles.mapPin, { backgroundColor: NEON_BLUE }]}>
          <Ionicons name="bicycle" size={14} color="white" />
        </View>
      </Marker>
    );
  }, [liveCourierCoords?.latitude, liveCourierCoords?.longitude, locale]);

  const customerMarker = useMemo(() => {
    if (!order?.customerLatitude || !order?.customerLongitude) return null;
    return (
      <Marker
        coordinate={{
          latitude: order.customerLatitude,
          longitude: order.customerLongitude,
        }}
        title={locale === 'en' ? 'You' : 'Ви'}
      >
        <View style={[styles.mapPin, { backgroundColor: '#FF2D55' }]}>
          <Ionicons name="home" size={14} color="white" />
        </View>
      </Marker>
    );
  }, [order?.customerLatitude, order?.customerLongitude, locale]);

  const handleSupportPress = () => {
    Alert.alert(
      locale === 'en' ? 'Contact Support' : 'Зв\'язатися з підтримкою',
      locale === 'en' ? 'Choose communication channel:' : 'Оберіть канал зв\'язку:',
      [
        {
          text: 'Telegram',
          onPress: () => Linking.openURL(`https://t.me/${SUPPORT_CONFIG.telegram}`)
        },
        {
          text: 'Viber',
          onPress: () => Linking.openURL(`viber://chat?number=${encodeURIComponent(SUPPORT_CONFIG.viber)}`)
        },
        {
          text: locale === 'en' ? 'Cancel' : 'Скасувати',
          style: 'cancel'
        }
      ]
    );
  };

  const handleConfirm = () => {
    Alert.alert(
      locale === 'en' ? 'Confirm Delivery' : 'Підтвердити отримання',
      locale === 'en' ? 'Did you receive your order?' : 'Ви отримали своє замовлення?',
      [
        { text: locale === 'en' ? 'No' : 'Ні', style: 'cancel' },
        { 
          text: locale === 'en' ? 'Yes, Received' : 'Так, отримано', 
          onPress: async () => {
            try {
              setIsConfirming(true);
              await dispatch(confirmOrder(order.deliveryId || order.id)).unwrap();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              Alert.alert(
                locale === 'en' ? 'Success' : 'Успішно',
                locale === 'en' ? 'Thank you for your confirmation!' : 'Дякуємо за підтвердження!'
              );
            } catch (e) {
              Alert.alert('Error', e);
            } finally {
              setIsConfirming(false);
            }
          }
        }
      ]
    );
  };

  const renderItem = useCallback(({ item }) => (
    <OrderItem item={item} theme={theme} locale={locale} />
  ), [theme, locale]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Dynamic Header Block */}
      <View style={[styles.dynamicHeader, { backgroundColor: statusDef.color + '15' }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1, justifyContent: 'space-between' }}>

          <View style={styles.headerTop}>
            <BackButton 
              color={theme.text} 
              onPress={() => safeBack(router)}
            />
            <View style={styles.headerTitleWrap}>
              <Text style={[styles.hashTitle, { color: theme.text }]}>{formatOrderNumber(order.deliveryId || order.id)}</Text>
            </View>
            <TouchableOpacity hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }} onPress={handleSupportPress} style={styles.headerHelpBtn}>
              <Ionicons name="help-buoy-outline" size={24} color={theme.textSecondary || 'gray'} />
            </TouchableOpacity>
          </View>

          <Animated.View style={[styles.headerCenter, { opacity: fadeAnim }]}>
            <Text style={styles.largeEmoji}>{statusDef.lottie}</Text>
            <Text style={[styles.mainStatusTitle, { color: theme.text }]}>
              {locale === 'en' ? statusDef.titleEn : statusDef.titleUk}
            </Text>

            {(currentStep > 0 && currentStep < 6 && order.estimatedMinutes) && (
              <View style={styles.etaBadge}>
                <View style={[styles.etaDot, { backgroundColor: statusDef.color }]} />
                <Text style={styles.etaText}>
                  ~ {order.estimatedMinutes} {locale === 'en' ? 'min' : 'хв'}
                </Text>
              </View>
            )}
          </Animated.View>
        </SafeAreaView>
      </View>

      <FlatList
        data={order.items || []}
        keyExtractor={(item, index) => (item.id ? item.id.toString() : index.toString())}
        contentContainerStyle={{ paddingBottom: 100 + insets.bottom }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.bodyWrap}>
            {/* The Horizontal Visual Tracker */}
            <View style={[styles.trackerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <HorizontalProgressBar currentStep={currentStep} theme={theme} />
              <View style={styles.datesRow}>
                {order.createdAt && <Text style={styles.dateText}>{formatUkraineDate(order.createdAt, { timeOnly: true })}</Text>}
                {order.estimatedDeliveryTime && currentStep < 6 && <Text style={[styles.dateText, { color: theme.primary, fontWeight: 'bold' }]}>{formatUkraineDate(order.estimatedDeliveryTime, { timeOnly: true })}</Text>}
              </View>
            </View>

            {isOnlinePayment(order.paymentMethod) && (
              <PaymentRetryCard 
                order={order} 
                locale={locale} 
                theme={theme} 
                currentStep={currentStep}
              />
            )}

            {/* Courier Glassmorphism Card — visible from 'accepted' onwards */}
            {(currentStep >= 1 || courierPhoto) && (
              <View style={styles.blurWrapper}>
                <BlurView intensity={Platform.OS === 'ios' ? 25 : 100} style={[styles.glassCard, { backgroundColor: theme.card + '20' }]}>
                  <View style={styles.courierRow}>
                    <View style={styles.courierLeft}>
                      {courierPhoto ? (
                        <Image source={{ uri: courierPhoto }} style={[styles.avatarPremium, { borderColor: theme.border }]} />
                      ) : (
                        <View style={[styles.avatarPremium, styles.avatarPlaceholder, { borderColor: theme.border }]}>
                          <Ionicons name="person" size={24} color="white" />
                        </View>
                      )}
                      <View style={{ marginLeft: hs(14), flex: 1 }}>
                        <Text style={[styles.courierName, { color: theme.text }]}>{courierName}</Text>
                        <Text style={styles.courierSub}>
                          {currentStep === 5 
                            ? (locale === 'en' ? 'Courier' : 'Кур\'єр')
                            : (locale === 'en' ? 'Biker Courier' : 'Велокур\'єр')}
                          {courierRating ? `  ★ ${courierRating.toFixed(1)}` : ''}
                        </Text>
                      </View>
                    </View>
                    {courierPhone && currentStep < 5 && (
                      <TouchableOpacity 
                        onPress={() => Linking.openURL(`tel:${courierPhone}`)} 
                        style={[styles.premiumCallBtn, { backgroundColor: theme.primary }]}
                      >
                        <Ionicons name="call" size={22} color="white" />
                      </TouchableOpacity>
                    )}
                  </View>
                </BlurView>
              </View>
            )}

            {/* Distance Banner for Delivering status */}
            {(currentStep === 4 && order.navigationStats?.toClientDistance) && (
              <View style={[styles.distanceBanner, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="navigate" size={20} color={theme.primary} />
                <Text style={{ marginLeft: hs(10), fontWeight: '700', color: theme.text }}>
                  {locale === 'en' ? 'Courier is ' : 'Кур\'єр за '} {order.navigationStats.toClientDistance} {locale === 'en' ? 'away' : 'від вас'}
                </Text>
              </View>
            )}

            {/* Real-time Map section */}
            {currentStep < 5 && (order.restaurantLatitude || order.customerLatitude) && (
              <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={{
                    latitude: order.customerLatitude || order.restaurantLatitude || 50.4501,
                    longitude: order.customerLongitude || order.restaurantLongitude || 30.5234,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                  pitchEnabled={false}
                  rotateEnabled={false}
                >
                  {restaurantMarker}
                  {courierMarker}
                  {customerMarker}

                  {routeCoords.length > 0 && (
                    <Polyline
                      coordinates={routeCoords}
                      strokeColor={theme.primary}
                      strokeWidth={4}
                      lineDashPattern={[0]}
                    />
                  )}
                </MapView>
              </View>
            )}

            {/* Awaiting Confirmation button when status is ready/delivered */}
            {(currentStep === 3 || currentStep === 4 || currentStep === 5) && order.status !== 'completed' && (
              <TouchableOpacity
                disabled={isConfirming}
                onPress={handleConfirm}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primary, shadowColor: theme.primary }
                ]}
              >
                <Ionicons name="checkmark-done-circle" size={24} color="white" />
                <Text style={styles.confirmBtnText}>
                  {isConfirming 
                    ? (locale === 'en' ? 'Confirming...' : 'Підтвердження...')
                    : (locale === 'en' ? 'I Received My Order' : 'Замовлення отримано')}
                </Text>
              </TouchableOpacity>
            )}

            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t(locale, 'items')}</Text>
          </View>
        }

        renderItem={renderItem}

        ListFooterComponent={
          <View style={styles.summaryWrap}>
            <View style={[styles.totalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>{t(locale, 'date')}</Text>
                <Text style={[styles.summaryVal, { color: theme.text }]}>
                  {formatUkraineDate(order.createdAt || order.date)}
                </Text>
              </View>
              {isPaidStatus(order.paymentStatus) && (
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={styles.summaryLabel}>Статус оплати</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Оплачено</Text>
                  </View>
                </View>
              )}
              {hasWeightedItems && (
                <View style={[styles.orderWeightNotice, { backgroundColor: theme.input }]}>
                  <Ionicons name="scale-outline" size={16} color={theme.primary} />
                  <Text style={[styles.orderWeightNoticeText, { color: theme.textSecondary }]}>
                    {isFullyWeighed 
                      ? (locale === 'en' ? 'All items weighed, price adjusted.' : 'Всі товари зважено, ціну скориговано.')
                      : (locale === 'en' ? 'Awaiting kitchen weighing, price is estimated.' : 'Очікує зважування на кухні, ціна є орієнтовною.')}
                  </Text>
                </View>
              )}
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabelTotal}>{t(locale, 'amount')}</Text>
                <Text style={[styles.summaryTotalVal, { color: theme.primary }]}>
                  {formatPrice(safeNumber(order.totalPrice ?? order.total))} ₴
                </Text>
              </View>
            </View>
          </View>
        }
      />
    </View>
  );
}

// ──────────────────────────────────────────────────────────────
// Premium Styles
// ──────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  backButton: { marginTop: 15, backgroundColor: '#000000', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },

  dynamicHeader: { minHeight: vs(260), borderBottomLeftRadius: r(36), borderBottomRightRadius: r(36), overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: hs(20), paddingTop: vs(10) },
  headerBackBtn: { width: ms(44), height: ms(44), borderRadius: r(22), backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerHelpBtn: { width: ms(44), height: ms(44), borderRadius: r(22), backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  hashTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Menlo' },

  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: vs(20) },
  largeEmoji: { fontSize: fs(72), marginBottom: vs(10), shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
  mainStatusTitle: { fontSize: fs(28), fontWeight: '900', letterSpacing: 0.5 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: hs(16), paddingVertical: vs(8), borderRadius: r(20), marginTop: vs(12), shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  etaDot: { width: ms(8), height: ms(8), borderRadius: r(4), marginRight: hs(8) },
  etaText: { fontSize: fs(16), fontWeight: '800', color: '#111' },

  bodyWrap: { paddingHorizontal: hs(20), paddingTop: vs(20) },
  
  confirmBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 20,
    marginTop: 20,
    marginBottom: 10,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 8,
    gap: 12,
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  trackerCard: { 
    borderRadius: r(24),
    padding: ms(20), 
    borderWidth: hairline(), 
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: vs(20), 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 }
    })
  },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: vs(-10), paddingHorizontal: hs(5) },
  dateText: { fontSize: fs(12), color: 'gray', fontWeight: '600' },

  blurWrapper: { 
    borderRadius: r(24), overflow: 'hidden', marginBottom: vs(24), 
    borderWidth: hairline(), 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  glassCard: { padding: ms(18) },
  courierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courierLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarPremium: { width: ms(56), height: ms(56), borderRadius: r(28), borderWidth: hairline() * 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarPlaceholder: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center' },
  courierName: { fontSize: fs(18), fontWeight: '800', marginBottom: vs(2) },
  courierSub: { fontSize: fs(13), color: '#888', fontWeight: '600' },
  premiumCallBtn: { 
    width: ms(50), height: ms(50), borderRadius: r(25), 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: hairline(),
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },

  sectionTitle: { fontSize: fs(20), fontWeight: '800', marginBottom: vs(16), marginTop: vs(10) },

  itemRowWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: hs(20), marginBottom: vs(12), padding: ms(14), borderRadius: r(16), backgroundColor: 'rgba(0,0,0,0.02)' },
  itemQtyBadge: { width: ms(34), height: ms(34), borderRadius: r(10), justifyContent: 'center', alignItems: 'center', marginRight: hs(12) },
  itemQtyText: { fontSize: fs(15), fontWeight: '800' },
  itemNameText: { flex: 1, fontSize: fs(16), fontWeight: '600' },
  itemPriceText: { fontSize: fs(16), fontWeight: '800', marginLeft: hs(10) },

  summaryWrap: { paddingHorizontal: hs(20), marginTop: vs(20) },
  totalCard: { 
    borderRadius: r(24),
    padding: ms(20), 
    borderWidth: hairline(), 
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 }
    })
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: fs(15), color: '#888', fontWeight: '600' },
  summaryVal: { fontSize: fs(15), fontWeight: '600' },
  divider: { height: hairline(), marginVertical: vs(16), opacity: 0.5 },
  summaryLabelTotal: { fontSize: fs(18), fontWeight: '800', color: '#888' },
  summaryTotalVal: { fontSize: fs(26), fontWeight: '900', color: '#000000' },

  paidBadge: { backgroundColor: '#2ecc71', paddingHorizontal: hs(12), paddingVertical: vs(4), borderRadius: r(8) },
  paidBadgeText: { color: 'white', fontWeight: '800', fontSize: fs(12), textTransform: 'uppercase' },
  distanceBanner: { 
    flexDirection: 'row', alignItems: 'center', borderRadius: r(20), 
    borderWidth: hairline(), 
    padding: ms(16), marginBottom: vs(16),
  },
  mapContainer: {
    height: vs(200),
    borderRadius: r(24),
    overflow: 'hidden',
    borderWidth: hairline(),
    marginBottom: vs(20),
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 }
    })
  },
  map: {
    flex: 1,
  },
  mapPin: {
    width: ms(32),
    height: ms(32),
    borderRadius: r(16),
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  orderWeightNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: hs(8),
    padding: ms(11),
    borderRadius: r(12),
    marginTop: vs(12),
    borderWidth: hairline(),
    borderColor: 'rgba(0,0,0,0.05)',
  },
  orderWeightNoticeText: {
    fontSize: fs(11),
    fontWeight: '600',
    flex: 1,
  },
});
