import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from "../store";
import { Platform, StatusBar, View } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { PersistGate } from 'redux-persist/integration/react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import usePushNotifications from '../hooks/usePushNotifications';
// import useLiveActivitySync from '../hooks/useLiveActivitySync';
import { fetchAddresses, fetchMe } from '../store/authSlice';
import { fetchOrders } from '../store/ordersSlice';
import { updatePushToken } from '../src/api';
import BottomBar from '../components/BottomBar';
import DynamicIsland from '../components/DynamicIsland';
import OfflineBanner from '../components/OfflineBanner';
// import AiAssistantFAB from '../components/AiAssistantFAB';
// import AiChatSheet from '../components/AiChatSheet';

function AppStartup() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(s => s.auth?.isAuthenticated);
  const { expoPushToken } = usePushNotifications();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  // Global Auth Guard
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
    } else {
      // If NOT authenticated, ensure we redirect to login
      // We ignore the root index '/' since it has its own logic, 
      // but if we somehow land on a protected screen, redirect immediately.
      const inAuthGroup = segments[0] === '(auth)';
      if (!inAuthGroup && pathname !== '/' && pathname) {
        setTimeout(() => {
          router.replace('/(auth)/login');
        }, 0);
      }
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isAuthenticated, segments, pathname]);

  useEffect(() => {
    if (isAuthenticated && expoPushToken) {
      console.log("Syncing Push Token to backend:", expoPushToken);
      updatePushToken(expoPushToken).catch(err => console.log('Failed to sync push token', err));
    }
  }, [expoPushToken, isAuthenticated]);

  return null;
}

function ThemeStatusBar() {
  const colorScheme = useColorScheme();
  return (
    <StatusBar
      translucent={false}
      backgroundColor={colorScheme === 'dark' ? '#171717' : '#fff'}
      barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'}
    />
  );
}

export default function RootLayout() {
  const pathname = usePathname();

  // Define screens that should display the BottomBar
  const mainScreens = ['/home', '/catalog', '/favorites', '/cart', '/orders', '/profile', '/courier'];
  const showBottomBar = mainScreens.includes(pathname);

  return (
    <SafeAreaProvider>
      <Provider store={store}>
        <PersistGate loading={null} persistor={persistor}>
          <ThemeStatusBar />
          <View style={{ flex: 1 }}>
            <Stack screenOptions={{ 
              headerShown: false,
              gestureEnabled: true,
              fullScreenGestureEnabled: false, // Gesture only from the left edge
              gestureResponseDistance: 50,    // Only first 50px from the left
              animation: Platform.OS === 'ios' ? 'default' : 'slide_from_left',
              animationDuration: 250,         // Faster transition
            }}>
              <Stack.Screen name="index" />
              <Stack.Screen name="home" />
              <Stack.Screen name="(auth)" />
            </Stack>

            {showBottomBar && <BottomBar />}
            
            {/* <DynamicIsland /> */}
            <OfflineBanner />
            
            {/* <AiAssistantFAB /> */}
            {/* <AiChatSheet /> */}
            <AppStartup />
            {/* <LiveActivityHookCaller /> */}
          </View>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}

// function LiveActivityHookCaller() {
//   useLiveActivitySync();
//   return null;
// }