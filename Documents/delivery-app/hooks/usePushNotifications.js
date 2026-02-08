import { useState, useEffect, useRef } from 'react';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';

// Налаштування: показувати сповіщення, навіть коли додаток відкритий
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState(false);
  const router = useRouter();
  
  const notificationListener = useRef();
  const responseListener = useRef();

  async function registerForPushNotificationsAsync() {
    let token;

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
        alert('Немає дозволу на пуш-сповіщення!');
        return;
      }

      // 👇 Тут пробуємо взяти ID автоматично, або використовуємо твій
      const projectId = Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId ?? 'b083b897-3d46-4a68-9a38-3833f0cc568c';

      try {
        token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        console.log("🔥 ВАШ НОВИЙ ТОКЕН:", token);
      } catch (e) {
        console.error("Помилка отримання токена:", e);
      }
    } else {
      console.log('На емуляторі пуші не працюють, потрібен телефон');
    }

    return token;
  }

  useEffect(() => {
    // 1. Отримуємо токен
    registerForPushNotificationsAsync().then(token => setExpoPushToken(token));

    // 2. Слухаємо вхідні (коли додаток відкритий)
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // 3. Слухаємо НАТИСКАННЯ (переходимо по посиланню)
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      // Якщо в пуші є { "url": "/cart" } — переходимо туди
      if (data?.url) {
        router.push(data.url);
      }
    });

    return () => {
      Notifications.removeNotificationSubscription(notificationListener.current);
      Notifications.removeNotificationSubscription(responseListener.current);
    };
  }, []);

  return { expoPushToken, notification };
}