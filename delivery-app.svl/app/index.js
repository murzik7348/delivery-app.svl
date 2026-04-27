import { useEffect, useState } from 'react';
import { View, ActivityIndicator, Platform } from 'react-native';
import { useRouter, useRootNavigationState } from 'expo-router';
import Constants from 'expo-constants';

const getNotifications = () => {
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};

const Notifications = getNotifications();

import { useSelector } from 'react-redux';

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);
  const isAuthenticated = useSelector(state => state.auth?.isAuthenticated);

  useEffect(() => {
    // Crucial fix: Do not try to route anywhere before root layout is completely mounted!
    if (!rootNavigationState?.key) return;

    async function checkLaunch() {
      try {
        let response = null;
        if (Notifications && Notifications.getLastNotificationResponseAsync) {
          response = await Notifications.getLastNotificationResponseAsync();
        }
        const url = response?.notification?.request?.content?.data?.url;

        if (isAuthenticated) {
          if (url) {
            console.log("🔔 ХОЛОДНИЙ СТАРТ: Летимо на", url);
            router.replace(url);
          } else {
            router.replace('/home');
          }
        } else {
          console.log("🔒 НЕ АВТОРИЗОВАНИЙ: На екран логіну");
          router.replace('/(auth)/login');
        }
      } catch (e) {
        console.error("Помилка старту:", e);
        if (isAuthenticated) {
          router.replace('/home');
        } else {
          router.replace('/(auth)/login');
        }
      } finally {
        setIsReady(true);
      }
    }

    checkLaunch();
  }, [rootNavigationState?.key, isAuthenticated]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <ActivityIndicator size="large" color="#e334e3" />
    </View>
  );
}