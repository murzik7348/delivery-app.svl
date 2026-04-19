import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from "../store";
import { Platform, StatusBar, useColorScheme } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import usePushNotifications from '../hooks/usePushNotifications';
import DynamicIsland from '../components/DynamicIsland';
// import useLiveActivitySync from '../hooks/useLiveActivitySync';
import { fetchAddresses, fetchMe } from '../store/authSlice';
import { fetchOrders } from '../store/ordersSlice';
import { updatePushToken } from '../src/api';

/**
 * Loads user data and addresses on app startup if already authenticated (persistent login).
 * fetchMe refreshes user profile from backend (including role).
 */
function AppStartup() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(s => s.auth?.isAuthenticated);
  const { expoPushToken } = usePushNotifications();

  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      dispatch(fetchMe());
      dispatch(fetchAddresses());
      dispatch(fetchOrders());

      // Poll order status every 30 seconds
      interval = setInterval(() => {
        dispatch(fetchOrders());
      }, 30000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      console.log("Syncing Push Token to backend:", expoPushToken);
      updatePushToken(expoPushToken).catch(err => console.log('Failed to sync push token', err));
    }
  }, [expoPushToken, isAuthenticated]);

  return null;
}

export default function RootLayout() {

  const colorScheme = useColorScheme();

  return (
    <SafeAreaProvider>
      {/* Fix Android status bar so it is NOT translucent */}
      <StatusBar
        translucent={false}
        backgroundColor={colorScheme === 'dark' ? '#000' : '#fff'}
        barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
      />
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(tabs)" />
            <Stack.Screen name="(auth)" />
            {/* Інші екрани */}
          </Stack>
          <DynamicIsland />
          {/* <LiveActivityManager /> */}
          <AppStartup />
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}