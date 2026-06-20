import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, Platform, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as WebBrowser from 'expo-web-browser';
import * as Haptics from 'expo-haptics';
import { useDispatch } from 'react-redux';
import { fetchOrderDetails } from '../store/ordersSlice';
import { getLiqPayCheckout } from '../src/api';
import { hs, vs, ms, fs, r, hairline } from '../utils/responsive';

export const isPaidStatus = (status) => {
  if (!status) return false;
  const s = String(status).toLowerCase().trim();
  return s !== 'pending';
};

export default function PaymentRetryCard({ order, locale, theme, currentStep }) {
  const dispatch = useDispatch();
  const [isPaying, setIsPaying] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  const startFastPolling = useCallback(() => {
    const deliveryId = order?.deliveryId || order?.id;
    let count = 0;
    const interval = setInterval(async () => {
      console.log(`[PaymentRetryCard] Fast polling tick ${count + 1}`);
      const result = await dispatch(fetchOrderDetails(deliveryId));
      const freshOrder = result?.payload;
      if (freshOrder && isPaidStatus(freshOrder.paymentStatus)) {
        console.log('[PaymentRetryCard] Payment status updated to paid, stopping polling.');
        clearInterval(interval);
      }
      count++;
      if (count >= 30) { // Poll for 60 seconds total
        clearInterval(interval);
      }
    }, 2000);
  }, [dispatch, order?.deliveryId, order?.id]);

  const handleRetryPayment = useCallback(async () => {
    const serverDeliveryId = order.serverDeliveryId || order.deliveryId || order.id;
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
        
        // Start polling immediately in the background (will run while browser is open)
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
      
      if (freshOrder && isPaidStatus(freshOrder.paymentStatus)) {
        Alert.alert(
          locale === 'en' ? 'Payment Successful' : 'Оплату успішно підтверджено',
          locale === 'en' ? 'Your payment has been received. The restaurant is preparing your order.' : 'Вашу оплату отримано. Ресторан вже готує ваше замовлення.'
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

  if (isPaidStatus(order?.paymentStatus) || currentStep >= 5) {
    return null;
  }

  return (
    <View style={[styles.paymentCard, { backgroundColor: '#ff950012', borderColor: '#ff950030' }]}>
      <View style={styles.paymentCardHeader}>
        <Ionicons name="warning-outline" size={24} color="#ff9500" />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ color: '#ff9500', fontWeight: '800', fontSize: 14 }}>
            {locale === 'en' ? 'Awaiting Payment' : 'Очікує оплати'}
          </Text>
          <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
            {locale === 'en' 
              ? 'Order is placed but unpaid. Please complete payment to proceed.' 
              : 'Замовлення оформлено, але не оплачено. Будь ласка, здійсніть оплату, щоб замовлення було передано в роботу.'}
          </Text>
        </View>
      </View>

      <View style={styles.paymentActionRow}>
        <TouchableOpacity
          onPress={handleRetryPayment}
          disabled={isPaying || isChecking}
          style={[
            styles.payBtn,
            { backgroundColor: theme.primary }
          ]}
        >
          <Ionicons name="card-outline" size={20} color="white" />
          <Text style={styles.payBtnText}>
            {isPaying 
              ? (locale === 'en' ? 'Opening...' : 'Відкриваємо...')
              : (locale === 'en' ? 'Pay Now' : 'Оплатити зараз')}
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
          <Ionicons name="refresh-outline" size={14} color={theme.primary} />
        )}
        <Text style={[styles.checkPaymentText, { color: theme.primary }]}>
          {locale === 'en' ? 'I paid (check status)' : 'Я вже оплатив (перевірити статус)'}
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
