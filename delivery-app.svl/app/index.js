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

import { store } from '../store';
import WelcomeScreen from '../components/WelcomeScreen';

export default function Index() {
  const router = useRouter();
  const rootNavigationState = useRootNavigationState();
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // Crucial fix: Do not try to route anywhere before root layout is completely mounted!
    if (!rootNavigationState?.key) return;

    let isMounted = true;
    let timerId = null;

    async function checkLaunch() {
      const state = store.getState();
      const isAuthenticated = state.auth?.isAuthenticated;

      try {
        let response = null;
        if (Notifications && Notifications.getLastNotificationResponseAsync) {
          response = await Notifications.getLastNotificationResponseAsync();
        }
        const url = response?.notification?.request?.content?.data?.url;

        if (isAuthenticated && url) {
          console.log("🔔 ХОЛОДНИЙ СТАРТ: Летимо на", url);
          timerId = setTimeout(() => {
            if (isMounted) router.replace(url);
          }, 100);
        } else {
          console.log("🔓 ВХІД ЯК ГІСТЬ АБО ЗВИЧАЙНИЙ СТАРТ: На головну");
          timerId = setTimeout(() => {
            if (isMounted) router.replace('/home');
          }, 100);
        }
      } catch (e) {
        console.error("Помилка старту:", e);
        if (isAuthenticated) {
          timerId = setTimeout(() => {
            if (isMounted) router.replace('/home');
          }, 100);
        } else {
          timerId = setTimeout(() => {
            if (isMounted) router.replace('/(auth)/login');
          }, 100);
        }
      } finally {
        if (isMounted) setIsReady(true);
      }
    }

    checkLaunch();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [rootNavigationState?.key]);

  return <WelcomeScreen />;
}