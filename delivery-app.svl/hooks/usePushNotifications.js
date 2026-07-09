import { useState, useEffect, useRef } from 'react';
import { Platform, NativeModules } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useRouter } from 'expo-router';

// Helper to get Notifications only when safe
const getNotifications = () => {
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

// Helper to get Firebase Messaging only when safe
const getFirebaseMessaging = () => {
  if (Constants.appOwnership === 'expo') return null;
  if (!NativeModules.RNFBMessagingModule) return null;
  try {
    return require('@react-native-firebase/messaging').default;
  } catch (e) {
    return null;
  }
};

const Notifications = getNotifications();
const firebaseMessaging = getFirebaseMessaging();

if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

export default function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const notificationListener = useRef();
  const responseListener = useRef();
  const router = useRouter();

  useEffect(() => {
    if (!Notifications) return;

    registerForPushNotificationsAsync().then(token => {
      if (token) {
        console.log('📲 FCM Token:', token);
        setExpoPushToken(token);
      }
    });

    // ─── FCM foreground handler ───────────────────────────────────────────────
    // Коли додаток відкритий — FCM не показує банер автоматично.
    // Перехоплюємо і показуємо через expo-notifications.
    let unsubscribeForeground = null;
    if (firebaseMessaging) {
      try {
        unsubscribeForeground = firebaseMessaging().onMessage(async remoteMessage => {
          console.log('📩 FCM foreground message:', remoteMessage);
          const { title, body } = remoteMessage.notification ?? {};
          if (Notifications && title) {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: title ?? 'Нове повідомлення',
                body: body ?? '',
                data: remoteMessage.data ?? {},
                sound: true,
                priority: Notifications.AndroidNotificationPriority?.MAX ?? 'max',
              },
              trigger: null,
            });
          }
        });
      } catch (err) {
        console.warn('⚠️ Firebase Messaging foreground handler error:', err.message);
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🔔 Notification tapped:', response);
      const data = response.notification.request.content.data;
      if (data?.orderId) {
        router.push({ pathname: '/order-details', params: { id: data.orderId } });
      } else if (data?.url) {
        router.push(data.url);
      }
    });

    return () => {
      if (notificationListener.current) notificationListener.current.remove();
      if (responseListener.current) responseListener.current.remove();
      if (unsubscribeForeground) unsubscribeForeground();
    };
  }, []);

  return { expoPushToken, notification };
}

async function registerForPushNotificationsAsync() {
  if (!Notifications) return null;

  const isExpoGo = Constants.appOwnership === 'expo';
  if (isExpoGo) {
    console.log('⚠️ Push Notifications не підтримуються в Expo Go. Використовуй dev build.');
    return null;
  }

  if (!Device.isDevice) {
    console.log('⚠️ Push Notifications потребують фізичний пристрій.');
    return null;
  }

  // Android — налаштування каналу сповіщень
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Сповіщення',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#e334e3',
      sound: 'default',
    });
  }

  // Запит дозволу (потрібно для iOS)
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  if (finalStatus !== 'granted') {
    console.log('❌ Дозвіл на push-сповіщення не надано.');
    return null;
  }

  // Отримуємо FCM токен через Firebase (працює на iOS і Android)
  if (firebaseMessaging) {
    try {
      const fcmToken = await firebaseMessaging().getToken();
      console.log('🔥 FCM Token (Firebase):', fcmToken);
      return fcmToken;
    } catch (e) {
      console.log('❌ Помилка отримання FCM токену:', e);
    }
  }

  return null;
}