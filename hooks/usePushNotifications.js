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
        const response = await Notifications.getLastNotificationResponseAsync();
        const url = response?.notification?.request?.content?.data?.url;

        if (url) {
          console.log("🔔 ХОЛОДНИЙ СТАРТ: Летимо на", url);
          router.replace(url);
        } else {
          router.replace('/(tabs)');
        }
      } catch (e) {
        console.error("Помилка старту:", e);
        router.replace('/(tabs)');
      } finally {
        setIsReady(true);
      }
    }

    checkLaunch();
  }, []);
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#e334e3" />
    </View>
  );
}