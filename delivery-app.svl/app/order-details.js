import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, Alert,
  StyleSheet, Animated, Easing, Dimensions, Linking, Platform
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import { HubConnectionBuilder } from '@microsoft/signalr';
import { getToken } from '../src/api/client';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../utils/dateUtils';
import { t } from '../constants/translations';
import { fetchOrderDetails, confirmOrder } from '../store/ordersSlice';
import { formatPrice } from '../store/cartSlice';
import * as Haptics from 'expo-haptics';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { safeBack } from '../utils/navigation';
import { syncLiveActivity, endActivity, startPolling, stopPolling } from '../services/LiveActivityService';

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

const OrderItem = React.memo(({ item, theme }) => (
  <View style={[styles.itemRowWrapper, { backgroundColor: theme.background }]}>
    <View style={[styles.itemQtyBadge, { backgroundColor: theme.input }]}>
      <Text style={[styles.itemQtyText, { color: theme.primary }]}>{item.quantity}x</Text>
    </View>
    <Text style={[styles.itemNameText, { color: theme.text }]} numberOfLines={2}>
      {item.productName || item.name || 'Товар'}
    </Text>
    <Text style={[styles.itemPriceText, { color: theme.text }]}>
      {formatPrice(
        item.totalLineAmount !== undefined && item.totalLineAmount !== null 
          ? safeNumber(item.totalLineAmount) 
          : (safeNumber(item.price) * safeNumber(item.quantity, 1))
      )} ₴
    </Text>
  </View>
));

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
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 20 },
  stepWrapper: { alignItems: 'center', justifyContent: 'center', width: 36, height: 36 },
  iconCircle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, height: 3, marginHorizontal: 4, borderRadius: 2 }
});

// ──────────────────────────────────────────────────────────────
// Premium Order Details Screen
// ──────────────────────────────────────────────────────────────
import BackButton from '../components/BackButton';

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

  const order = useSelector(state =>
    state.orders.orders.find(o => String(o.deliveryId || o.id) === String(id))
  );

  const activeStatus = order?.statusDelivery ?? order?.status ?? 'created';
  const currentStep = statusToStep(activeStatus);
  const courierName = order?.courierName || (locale === 'en' ? 'Searching...' : 'Шукаємо кур\'єра...');
  const courierRating = order?.courierRating;
  const courierPhone = order?.courierPhone;
  const courierPhoto = order?.courierPhoto;

  const [routeCoords, setRouteCoords] = useState([]);

  // Animate map to show restaurant/courier and customer pin
  useEffect(() => {
    if (mapRef.current) {
      const points = [];
      if (order?.customerLatitude && order?.customerLongitude) {
        points.push({ latitude: order.customerLatitude, longitude: order.customerLongitude });
      }
      if (liveCourierCoords?.latitude && liveCourierCoords?.longitude) {
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

        connection = new HubConnectionBuilder()
          .withUrl("https://api.andi.delivery/trackingHub", {
            accessTokenFactory: () => token
          })
          .withAutomaticReconnect()
          .build();

        // Custom timeout values to tolerate temporary network pauses
        connection.serverTimeoutInMilliseconds = 60000;
        connection.keepAliveIntervalInMilliseconds = 15000;

        connection.on("ReceiveLocation", (data) => {
          console.log('📡 [SignalR User] ReceiveLocation:', data);
          if (data && data.lat !== undefined && data.lng !== undefined) {
            setLiveCourierCoords({
              latitude: Number(data.lat),
              longitude: Number(data.lng),
            });
            setHasRealSignalRCoords(true);
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

  // 2. Fallback / Simulation logic for courier location on map
  useEffect(() => {
    if (!order) return;
    const restLat = order.restaurantLatitude;
    const restLng = order.restaurantLongitude;
    const custLat = order.customerLatitude;
    const custLng = order.customerLongitude;

    // If we have received real coords from SignalR, do not overwrite them with simulation/fallback
    if (hasRealSignalRCoords) return;

    // Use initial REST API courier coordinates if they exist
    if (order.courierLatitude > 0 && order.courierLongitude > 0) {
      setLiveCourierCoords({
        latitude: order.courierLatitude,
        longitude: order.courierLongitude,
      });
      return;
    }

    // Otherwise, simulate movement when status is delivering (step 4)
    if (currentStep === 4 && restLat && custLat) {
      let fraction = 0;
      const interval = setInterval(() => {
        fraction = (fraction + 0.02) % 1.0;
        const currentLat = restLat + (custLat - restLat) * fraction;
        const currentLng = restLng + (custLng - restLng) * fraction;
        setLiveCourierCoords({
          latitude: currentLat,
          longitude: currentLng,
        });
      }, 1000);
      return () => clearInterval(interval);
    } else if (restLat) {
      setLiveCourierCoords({
        latitude: restLat,
        longitude: restLng,
      });
    }
  }, [
    order?.courierLatitude, 
    order?.courierLongitude, 
    currentStep, 
    order?.restaurantLatitude, 
    order?.customerLatitude,
    hasRealSignalRCoords
  ]);


  useFocusEffect(
    React.useCallback(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      if (!id) return;

      const fetchAndSync = async () => {
        const result = await dispatch(fetchOrderDetails(id));
        return result?.payload;
      };

      startPolling(id, fetchAndSync);

      return () => {
        // MM: We don't stop polling here so it continues globally
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
  }, [order?.restaurantLatitude, order?.restaurantLongitude, locale]);

  const customerMarker = useMemo(() => {
    if (!order?.customerLatitude || !order?.customerLongitude) return null;
    return (
      <Marker
        coordinate={{
          latitude: order.customerLatitude,
          longitude: order.customerLongitude,
        }}
        title={locale === 'en' ? 'Your Address' : 'Ваша адреса'}
      >
        <View style={[styles.mapPin, { backgroundColor: '#3498db' }]}>
          <Ionicons name="home" size={14} color="white" />
        </View>
      </Marker>
    );
  }, [order?.customerLatitude, order?.customerLongitude, locale]);

  const renderItem = useCallback(({ item }) => (
    <OrderItem item={item} theme={theme} />
  ), [theme]);

  const handleSupportPress = () => {
    Alert.alert(
      locale === 'en' ? 'Support' : 'Служба підтримки',
      locale === 'en' ? 'Choose where to contact us:' : 'Оберіть месенджер для зв\'язку:',
      [
        {
          text: 'Telegram',
          onPress: () => Linking.openURL(`tg://resolve?domain=@${SUPPORT_CONFIG.telegram}`)
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

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Dynamic Header Block */}
      <View style={[styles.dynamicHeader, { backgroundColor: statusDef.color + '15' }]}>
        <SafeAreaView edges={['top']} style={{ flex: 1, justifyContent: 'space-between' }}>

          <View style={styles.headerTop}>
            <BackButton color={theme.text} />
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

            {/* Courier Glassmorphism Card — visible from 'accepted' onwards */}
            {(currentStep >= 1 || courierPhoto) && (
              <View style={styles.blurWrapper}>
                <BlurView intensity={colorScheme === 'dark' ? 30 : 60} tint={colorScheme} style={styles.glassCard}>
                  <View style={styles.courierRow}>
                    <View style={styles.courierLeft}>
                      {courierPhoto ? (
                        <Image source={{ uri: courierPhoto }} style={styles.avatarPremium} />
                      ) : (
                        <View style={[styles.avatarPremium, styles.avatarPlaceholder]}>
                          <Ionicons name="bicycle" size={28} color="white" />
                        </View>
                      )}
                      <View style={{ marginLeft: 14 }}>
                        <Text style={[styles.courierName, { color: theme.text }]}>{courierName}</Text>
                        <Text style={styles.courierSub}>
                          {t(locale, 'courier')} {courierRating ? `• ⭐ ${courierRating}` : ''}
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        if (courierPhone) Alert.alert(t(locale, 'call'), courierPhone);
                      }}
                      style={[styles.premiumCallBtn, { backgroundColor: courierPhone ? '#34C759' : '#555' }]}
                    >
                      <Ionicons name="call" size={22} color="white" />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </View>
            )}

            {order.restaurantLatitude && order.customerLatitude && (
              <View style={[styles.mapContainer, { borderColor: theme.border }]}>
                <MapView
                  ref={mapRef}
                  style={styles.map}
                  provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                  initialRegion={{
                    latitude: (order.restaurantLatitude + order.customerLatitude) / 2,
                    longitude: (order.restaurantLongitude + order.customerLongitude) / 2,
                    latitudeDelta: Math.max(Math.abs(order.restaurantLatitude - order.customerLatitude) * 2, 0.015),
                    longitudeDelta: Math.max(Math.abs(order.restaurantLongitude - order.customerLongitude) * 2, 0.015),
                  }}
                  scrollEnabled={true}
                  zoomEnabled={true}
                >
                  {/* Restaurant Marker */}
                  {restaurantMarker}

                  {/* Customer Marker */}
                  {customerMarker}

                  {/* Courier Marker */}
                  {currentStep >= 1 && currentStep < 5 && liveCourierCoords && (
                    <Marker
                      coordinate={liveCourierCoords}
                      title={locale === 'en' ? 'Courier' : 'Кур\'єр'}
                    >
                      <View style={[styles.mapPin, { backgroundColor: '#f1c40f', borderWidth: 2, borderColor: 'white' }]}>
                        <Ionicons name="bicycle" size={16} color="black" />
                      </View>
                    </Marker>
                  )}

                  {/* Route Line */}
                  <Polyline
                    coordinates={routeCoords.length > 0 ? routeCoords : [
                      { latitude: liveCourierCoords?.latitude || order.restaurantLatitude, longitude: liveCourierCoords?.longitude || order.restaurantLongitude },
                      { latitude: order.customerLatitude, longitude: order.customerLongitude },
                    ]}
                    strokeColor={theme.primary}
                    strokeWidth={3}
                    lineDashPattern={routeCoords.length > 0 ? undefined : [5, 5]}
                  />
                </MapView>
              </View>
            )}

            {/* Distance to client banner when delivering */}
            {currentStep === 4 && order.navigationStats?.toClientDistance && (
              <View style={[styles.distanceBanner, { backgroundColor: '#3498db12', borderColor: '#3498db30' }]}>
                <Ionicons name="navigate" size={22} color="#3498db" />
                <View style={{ marginLeft: 12 }}>
                  <Text style={{ color: '#3498db', fontWeight: '800', fontSize: 13 }}>
                    {locale === 'en' ? 'Courier is on the way' : 'Курєр вже їде'}
                  </Text>
                  <Text style={{ color: '#3498db', fontWeight: '900', fontSize: 20 }}>
                    {order.navigationStats.toClientDistance}{order.navigationStats.toClientTime ? `  ·  ${order.navigationStats.toClientTime}` : ''}
                  </Text>
                </View>
              </View>
            )}

            {/* Confirm Delivery Button for User */}
            {currentStep === 4 && (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isConfirming}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: theme.primary, shadowColor: theme.primary }
                ]}
              >
                <Ionicons name="checkmark-done-circle" size={24} color="white" />
                <Text style={styles.confirmBtnText}>
                  {isConfirming 
                    ? (locale === 'en' ? 'Confirming...' : 'Підтвердження...')
                    : (locale === 'en' ? 'Confirm Delivery' : 'Підтвердити отримання')}
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
              {order.paymentStatus === 'success' && (
                <View style={[styles.summaryRow, { marginTop: 8 }]}>
                  <Text style={styles.summaryLabel}>Статус оплати</Text>
                  <View style={styles.paidBadge}>
                    <Text style={styles.paidBadgeText}>Оплачено</Text>
                  </View>
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

  dynamicHeader: { height: 260, borderBottomLeftRadius: 36, borderBottomRightRadius: 36, overflow: 'hidden' },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 10 },
  headerBackBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerHelpBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
  headerTitleWrap: { flex: 1, alignItems: 'center' },
  hashTitle: { fontSize: 18, fontWeight: '800', fontFamily: 'Menlo' },

  headerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 20 },
  largeEmoji: { fontSize: 72, marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.15, shadowRadius: 15 },
  mainStatusTitle: { fontSize: 28, fontWeight: '900', letterSpacing: 0.5 },
  etaBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.9)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginTop: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  etaDot: { width: 8, height: 8, borderRadius: 4, marginRight: 8 },
  etaText: { fontSize: 16, fontWeight: '800', color: '#111' },

  bodyWrap: { paddingHorizontal: 20, paddingTop: 20 },
  
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
    borderRadius: 24, padding: 20, 
    borderWidth: StyleSheet.hairlineWidth, 
    borderColor: 'rgba(0,0,0,0.05)',
    marginBottom: 20, 
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 }
    })
  },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10, paddingHorizontal: 5 },
  dateText: { fontSize: 12, color: 'gray', fontWeight: '600' },

  blurWrapper: { 
    borderRadius: 24, overflow: 'hidden', marginBottom: 24, 
    borderWidth: StyleSheet.hairlineWidth, 
    borderColor: 'rgba(255,255,255,0.1)' 
  },
  glassCard: { padding: 18 },
  courierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courierLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarPremium: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarPlaceholder: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center' },
  courierName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  courierSub: { fontSize: 13, color: '#888', fontWeight: '600' },
  premiumCallBtn: { 
    width: 50, height: 50, borderRadius: 25, 
    justifyContent: 'center', alignItems: 'center', 
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 3 }
    })
  },

  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16, marginTop: 10 },

  itemRowWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)' },
  itemQtyBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemQtyText: { fontSize: 15, fontWeight: '800' },
  itemNameText: { flex: 1, fontSize: 16, fontWeight: '600' },
  itemPriceText: { fontSize: 16, fontWeight: '800', marginLeft: 10 },

  summaryWrap: { paddingHorizontal: 20, marginTop: 20 },
  totalCard: { 
    borderRadius: 24, padding: 20, 
    borderWidth: StyleSheet.hairlineWidth, 
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 2 }
    })
  },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, color: '#888', fontWeight: '600' },
  summaryVal: { fontSize: 15, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, marginVertical: 16, opacity: 0.5 },
  summaryLabelTotal: { fontSize: 18, fontWeight: '800', color: '#888' },
  summaryTotalVal: { fontSize: 26, fontWeight: '900', color: '#000000' },

  paidBadge: { backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  paidBadgeText: { color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
  distanceBanner: { 
    flexDirection: 'row', alignItems: 'center', borderRadius: 20, 
    borderWidth: StyleSheet.hairlineWidth, 
    padding: 16, marginBottom: 16 
  },
  mapContainer: {
    height: 200,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
      android: { elevation: 2 }
    })
  },
  map: {
    flex: 1,
  },
  mapPin: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
});
