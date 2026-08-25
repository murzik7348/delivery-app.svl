import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { fetchOrderDetails } from '../store/ordersSlice';
import { getLiqPayCheckout } from '../src/api';
import { hs, vs, ms, fs, r, hairline } from '../utils/responsive';

export const getPaymentStatus = (order) => {
  const s = order?.statusPayment ?? order?.paymentStatus ?? order?.status_payment ?? '';
  return String(s).toLowerCase().trim();
};

export const isPaidStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s === 'paid' || s === 'success' || s === 'completed' || s === 'hold_wait' || s === 'hold';
};

export default function PaymentRetryCard({ order, locale, theme, currentStep }) {
  const dispatch = useDispatch();
  const [isPaying, setIsPaying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const rawStatus = getPaymentStatus(order);

  const startFastPolling = useCallback(() => {
    const deliveryId = order?.deliveryId || order?.id;
    let count = 0;
    const interval = setInterval(async () => {
      console.log(`[PaymentRetryCard] Fast polling tick ${count + 1}`);
      const result = await dispatch(fetchOrderDetails(deliveryId));
      const freshOrder = result?.payload;
      if (freshOrder && isPaidStatus(getPaymentStatus(freshOrder))) {
        console.log('[PaymentRetryCard] Payment status updated to paid/hold, stopping polling.');
        clearInterval(interval);
      }
      count++;
      if (count >= 30) { // Poll for 60 seconds total
        clearInterval(interval);
      }
    }, 2000);
  }, [dispatch, order?.deliveryId, order?.id]);

  const handleRetryPayment = useCallback(async () => {
    const serverDeliveryId = order?.serverDeliveryId || order?.deliveryId || order?.id;
    const numericId = parseInt(serverDeliveryId, 10);
    
    if (isNaN(numericId)) {
      Alert.alert(
        locale === 'en' ? 'Error' : 'Помилка',
        locale === 'en' ? 'Invalid order ID.' : 'Некоректний ID замовлення.'
      );
      return;
    }

    try {
      setIsPaying(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      console.log('[PaymentRetryCard] Requesting LiqPay token for retry ID:', numericId);
      const liqPayResponse = await getLiqPayCheckout(numericId);
      
      if (liqPayResponse?.data && liqPayResponse?.signature) {
        const checkoutUrl = `https://www.liqpay.ua/api/3/checkout?data=${liqPayResponse.data}&signature=${liqPayResponse.signature}`;
        console.log('[PaymentRetryCard] Attempting to open browser for LiqPay retry...');
        
        startFastPolling();

        await WebBrowser.openBrowserAsync(checkoutUrl, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          readerMode: false,
        });
        
        console.log('[PaymentRetryCard] WebBrowser closed, triggering final check');
        dispatch(fetchOrderDetails(order?.deliveryId || order?.id));
      } else {
        Alert.alert(
          locale === 'en' ? 'Invalid Payment Config' : 'Помилка платіжних даних',
          locale === 'en' ? 'The server returned invalid data for LiqPay.' : 'Сервер повернув некоректні дані від LiqPay.'
        );
      }
    } catch (err) {
      console.error('[PaymentRetryCard] Retry payment failed:', err);
      Alert.alert(
        locale === 'en' ? 'Payment Gateway Error' : 'Помилка шлюзу оплати',
        err.message || String(err)
      );
    } finally {
      setIsPaying(false);
    }
  }, [order?.serverDeliveryId, order?.deliveryId, order?.id, locale, startFastPolling, dispatch]);

  const handleManualCheck = useCallback(async () => {
    const deliveryId = order?.deliveryId || order?.id;
    try {
      setIsChecking(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const result = await dispatch(fetchOrderDetails(deliveryId));
      const freshOrder = result?.payload;
      const freshStatus = getPaymentStatus(freshOrder);
      
      if (freshOrder && isPaidStatus(freshStatus)) {
        Alert.alert(
          locale === 'en' ? 'Payment Verified' : 'Оплату підтверджено',
          freshStatus === 'hold_wait' || freshStatus === 'hold'
            ? (locale === 'en' ? 'Funds reserved on your card (Hold).' : 'Кошти успішно зарезервовано на вашій картці (Холд).')
            : (locale === 'en' ? 'Your payment has been received.' : 'Вашу оплату отримано.')
        );
      } else {
        Alert.alert(
          locale === 'en' ? 'Payment Not Detected' : 'Оплату не виявлено',
          locale === 'en' 
            ? 'We have not received payment confirmation yet. If you have just paid, please wait a few seconds and try again.' 
            : 'Підтвердження оплати ще не надійшло. Якщо ви щойно оплатили, зачекайте кілька секунд і спробуйте знову.'
        );
      }
    } catch (err) {
      console.warn('[PaymentRetryCard] Manual check failed:', err);
      Alert.alert(
        locale === 'en' ? 'Check Failed' : 'Помилка перевірки',
        locale === 'en' ? 'Failed to verify payment status. Please try again.' : 'Не вдалося перевірити статус оплати. Спробуйте ще раз.'
      );
    } finally {
      setIsChecking(false);
    }
  }, [dispatch, order?.deliveryId, order?.id, locale]);

  // If order is completed/delivered or already fully settled
  if (currentStep >= 5 && (rawStatus === 'paid' || rawStatus === 'success' || rawStatus === 'completed')) {
    return null;
  }

  // 1. HOLD / RESERVED: Money is already secured in gateway
  if (rawStatus === 'hold_wait' || rawStatus === 'hold') {
    return (
      <View style={[styles.paymentCard, { backgroundColor: '#0ea5e912', borderColor: '#0ea5e935' }]}>
        <View style={styles.paymentCardHeader}>
          <View style={[styles.iconCircle, { backgroundColor: '#0ea5e920' }]}>
            <Ionicons name="shield-checkmark" size={22} color="#0ea5e9" />
          </View>
          <View style={{ marginLeft: 12, flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ color: '#0ea5e9', fontWeight: '800', fontSize: 14 }}>
                {locale === 'en' ? 'Funds Reserved (Hold)' : 'Оплата зарезервована (Холд)'}
              </Text>
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
              {locale === 'en'
                ? 'Funds are held securely on your card and will be captured upon successful delivery.'
                : 'Кошти заблоковано на вашій картці та будуть остаточно списані лише після вручення замовлення.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  // 2. PAID / SUCCESS
  if (rawStatus === 'paid' || rawStatus === 'success' || rawStatus === 'completed') {
    return null;
  }

  // 3. PENDING or UNPAID: Urgent warning banner to prompt the user
  const isFailed = rawStatus === 'failed' || rawStatus === 'failure';

  return (
    <View style={[styles.paymentCard, { backgroundColor: isFailed ? '#ef444415' : '#f59e0b15', borderColor: isFailed ? '#ef444440' : '#f59e0b40' }]}>
      <View style={styles.paymentCardHeader}>
        <View style={[styles.iconCircle, { backgroundColor: isFailed ? '#ef444422' : '#f59e0b22' }]}>
          <Ionicons name={isFailed ? "close-circle" : "warning"} size={24} color={isFailed ? "#ef4444" : "#f59e0b"} />
        </View>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: isFailed ? '#ef4444' : '#f59e0b', fontWeight: '800', fontSize: 14 }}>
            {isFailed 
              ? (locale === 'en' ? 'Payment Failed ❌' : 'Помилка оплати ❌')
              : (locale === 'en' ? 'Order Awaiting Payment ⚠️' : 'Увага: Замовлення очікує оплати! ⚠️')}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 3, lineHeight: 17 }}>
            {isFailed
              ? (locale === 'en' ? 'Transaction was declined. Please try paying again.' : 'Не вдалося здійснити транзакцію. Спробуйте оплатити знову.')
              : (locale === 'en' ? 'Please complete the payment online so the kitchen and courier can proceed immediately.' : 'Будь ласка, здійсніть оплату онлайн, щоб замовлення було передано в роботу кухні та кур\'єру.')}
          </Text>
        </View>
      </View>

      <View style={styles.paymentActionRow}>
        <TouchableOpacity
          onPress={handleRetryPayment}
          disabled={isPaying || isChecking}
          style={[
            styles.payBtn,
            { backgroundColor: isFailed ? '#ef4444' : theme.primary }
          ]}
        >
          <Ionicons name="card-outline" size={20} color="white" />
          <Text style={styles.payBtnText}>
            {isPaying 
              ? (locale === 'en' ? 'Opening Gateway...' : 'Відкриваємо...')
              : (locale === 'en' ? 'Pay Online (LiqPay)' : 'Оплатити онлайн (LiqPay)')}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={handleManualCheck}
        disabled={isPaying || isChecking}
        style={styles.checkPaymentLink}
        activeOpacity={0.7}
      >
        {isChecking ? (
          <ActivityIndicator size="small" color={theme.primary} />
        ) : (
          <Ionicons name="refresh-outline" size={15} color={theme.primary} />
        )}
        <Text style={[styles.checkPaymentText, { color: theme.primary }]}>
          {locale === 'en' ? 'I have already paid (check status)' : 'Я вже оплатив (перевірити статус)'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  paymentCard: {
    borderRadius: r(24),
    padding: ms(18),
    borderWidth: hairline(),
    marginBottom: vs(20),
    ...Platform.select({
      ios: { shadowColor: '#ff9500', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 }
    })
  },
  paymentCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: vs(12)
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  paymentActionRow: {
    flexDirection: 'row',
    marginTop: vs(4),
  },
  payBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 8,
  },
  payBtnText: {
    color: 'white',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  checkPaymentLink: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: hs(6),
    marginTop: vs(14),
    paddingVertical: vs(6),
  },
  checkPaymentText: {
    fontSize: 13,
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
});
