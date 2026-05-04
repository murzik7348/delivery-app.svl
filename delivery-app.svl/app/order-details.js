import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Image, FlatList, Alert,
  StyleSheet, useColorScheme, Animated, Easing, Dimensions, Linking
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../constants/dateUtils';
import { t } from '../constants/translations';
import { fetchOrderDetails, confirmOrder } from '../store/ordersSlice';
import * as Haptics from 'expo-haptics';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { safeBack } from '../utils/navigation';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ──────────────────────────────────────────────────────────────
// Premium Config & Helpers
// ──────────────────────────────────────────────────────────────
const MAGENTA = '#E22BC6';
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
  const intervalRef = useRef(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;

  const order = useSelector(state =>
    state.orders.orders.find(o => String(o.deliveryId || o.id) === String(id))
  );

  useFocusEffect(
    React.useCallback(() => {
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }).start();

      if (!id) return;
      dispatch(fetchOrderDetails(id));
      intervalRef.current = setInterval(() => {
        dispatch(fetchOrderDetails(id));
      }, 10000); // Polling every 10s for snappier updates

      return () => clearInterval(intervalRef.current);
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

  const activeStatus = order.statusDelivery ?? order.status ?? 'created';
  const currentStep = statusToStep(activeStatus);
  const statusDef = STATUS_CONFIG[currentStep] || STATUS_CONFIG[0];

  const courierName = order.courierName || (locale === 'en' ? 'Searching...' : 'Шукаємо кур\'єра...');
  const courierRating = order.courierRating;
  const courierPhone = order.courierPhone;
  const courierPhoto = order.courierPhoto;

  const [isConfirming, setIsConfirming] = useState(false);

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
        contentContainerStyle={{ paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.bodyWrap}>
            {/* The Horizontal Visual Tracker */}
            <View style={[styles.trackerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <HorizontalProgressBar currentStep={currentStep} theme={theme} />
              <View style={styles.datesRow}>
                {order.createdAt && <Text style={styles.dateText}>{formatUkraineDate(order.createdAt, { timeOnly: true })}</Text>}
                {order.estimatedDeliveryTime && currentStep < 6 && <Text style={[styles.dateText, { color: MAGENTA, fontWeight: 'bold' }]}>{formatUkraineDate(order.estimatedDeliveryTime, { timeOnly: true })}</Text>}
              </View>
            </View>

            {/* Courier Glassmorphism Card */}
            {(currentStep >= 5 || courierPhoto) && (
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

            {/* Confirm Delivery Button for User */}
            {currentStep === 4 && (
              <TouchableOpacity
                onPress={handleConfirm}
                disabled={isConfirming}
                style={[
                  styles.confirmBtn,
                  { backgroundColor: MAGENTA, shadowColor: MAGENTA }
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

        renderItem={({ item }) => (
          <View style={[styles.itemRowWrapper, { backgroundColor: theme.background }]}>
            <View style={[styles.itemQtyBadge, { backgroundColor: theme.input }]}>
              <Text style={[styles.itemQtyText, { color: MAGENTA }]}>{item.quantity}x</Text>
            </View>
            <Text style={[styles.itemNameText, { color: theme.text }]} numberOfLines={2}>
              {item.productName || item.name || 'Товар'}
            </Text>
            <Text style={[styles.itemPriceText, { color: theme.text }]}>
              {item.totalLineAmount !== undefined && item.totalLineAmount !== null 
                ? safeNumber(item.totalLineAmount) 
                : (safeNumber(item.price) * safeNumber(item.quantity, 1))} ₴
            </Text>
          </View>
        )}

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
                <Text style={styles.summaryTotalVal}>
                  {safeNumber(order.totalPrice ?? order.total)} ₴
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
  backButton: { marginTop: 15, backgroundColor: MAGENTA, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },

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

  trackerCard: { borderRadius: 24, padding: 20, borderWidth: 1, marginBottom: 20, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 2 },
  datesRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -10, paddingHorizontal: 5 },
  dateText: { fontSize: 12, color: 'gray', fontWeight: '600' },

  blurWrapper: { borderRadius: 24, overflow: 'hidden', marginBottom: 24, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  glassCard: { padding: 18 },
  courierRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  courierLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  avatarPremium: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)' },
  avatarPlaceholder: { backgroundColor: '#FF9500', justifyContent: 'center', alignItems: 'center' },
  courierName: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  courierSub: { fontSize: 13, color: '#888', fontWeight: '600' },
  premiumCallBtn: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 3 },

  sectionTitle: { fontSize: 20, fontWeight: '800', marginBottom: 16, marginTop: 10 },

  itemRowWrapper: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, marginBottom: 12, padding: 14, borderRadius: 16, backgroundColor: 'rgba(0,0,0,0.02)' },
  itemQtyBadge: { width: 34, height: 34, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  itemQtyText: { fontSize: 15, fontWeight: '800' },
  itemNameText: { flex: 1, fontSize: 16, fontWeight: '600' },
  itemPriceText: { fontSize: 16, fontWeight: '800', marginLeft: 10 },

  summaryWrap: { paddingHorizontal: 20, marginTop: 20 },
  totalCard: { borderRadius: 24, padding: 20, borderWidth: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 15, shadowOffset: { width: 0, height: 8 }, elevation: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  summaryLabel: { fontSize: 15, color: '#888', fontWeight: '600' },
  summaryVal: { fontSize: 15, fontWeight: '600' },
  divider: { height: 1, marginVertical: 16, opacity: 0.5 },
  summaryLabelTotal: { fontSize: 18, fontWeight: '800', color: '#888' },
  summaryTotalVal: { fontSize: 26, fontWeight: '900', color: MAGENTA },

  paidBadge: { backgroundColor: '#2ecc71', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 8 },
  paidBadgeText: { color: 'white', fontWeight: '800', fontSize: 12, textTransform: 'uppercase' },
});
