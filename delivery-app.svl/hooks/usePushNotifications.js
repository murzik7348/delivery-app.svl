import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
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

    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // ─── Foreground FCM handler ───────────────────────────────────────────────
    // When the app is open, FCM doesn't show a banner automatically.
    // We intercept the message and schedule a local notification instead.
    let unsubscribeForeground = null;
    if (firebaseMessaging) {
      unsubscribeForeground = firebaseMessaging().onMessage(async remoteMessage => {
        console.log('📩 FCM foreground message received:', remoteMessage);
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
            trigger: null, // показати одразу
          });
        }
      });
    }
    // ─────────────────────────────────────────────────────────────────────────

    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification tapped:', response);
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
  let token;

  // SDK 53+ in Expo Go doesn't support remote notifications on Android
  const isExpoGo = Constants.appOwnership === 'expo';
  if (Platform.OS === 'android' && isExpoGo) {
    console.log('⚠️ Push Notifications are not supported in Expo Go on Android (SDK 53+). Use a development build.');
    return null;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#FF231F7C',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    try {
      if (Platform.OS === 'android') {
        token = (await Notifications.getDevicePushTokenAsync()).data;
      } else {
        const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
      }
      console.log("📲 Retrieved Push Token:", token);
    } catch (e) {
      console.log("❌ Error getting push token:", e);
    }
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}