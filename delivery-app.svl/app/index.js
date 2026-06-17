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

    async function checkLaunch() {
      const state = store.getState();
      const isAuthenticated = state.auth?.isAuthenticated;

      try {
        let response = null;
        if (Notifications && Notifications.getLastNotificationResponseAsync) {
          response = await Notifications.getLastNotificationResponseAsync();
        }
        const url = response?.notification?.request?.content?.data?.url;

        if (isAuthenticated) {
          if (url) {
            console.log("🔔 ХОЛОДНИЙ СТАРТ: Летимо на", url);
            setTimeout(() => {
              router.replace(url);
            }, 100);
          } else {
            setTimeout(() => {
              router.replace('/home');
            }, 100);
          }
        } else {
          console.log("🔒 НЕ АВТОРИЗОВАНИЙ: На екран логіну");
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 100);
        }
      } catch (e) {
        console.error("Помилка старту:", e);
        if (isAuthenticated) {
          setTimeout(() => {
            router.replace('/home');
          }, 100);
        } else {
          setTimeout(() => {
            router.replace('/(auth)/login');
          }, 100);
        }
      } finally {
        setIsReady(true);
      }
    }

    checkLaunch();
  }, [rootNavigationState?.key]);

  return <WelcomeScreen />;
}