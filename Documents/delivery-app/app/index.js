import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';

export default function Index() {
  const router = useRouter();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function checkLaunch() {
      try {
        // 1. Питаємо систему: "Мене відкрили через сповіщення?"
        const response = await Notifications.getLastNotificationResponseAsync();
        const url = response?.notification?.request?.content?.data?.url;

        if (url) {
          console.log("🔔 ХОЛОДНИЙ СТАРТ: Летимо на", url);
          // Якщо так — відправляємо зразу туди (напр. /cart)
          router.replace(url);
        } else {
          // Якщо ні — просто відкриваємо меню
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error("Помилка старту:", e);
        // У будь-якому незрозумілому випадку — на Головну
        router.replace('/(tabs)');
      } finally {
        setIsReady(true);
      }
    }

    checkLaunch();
  }, []);

  // Показуємо крутилку пару мілісекунд, поки думаємо
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#e334e3" />
    </View>
  );
}