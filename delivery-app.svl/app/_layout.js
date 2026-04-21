import { Stack, usePathname } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from "../store";
import { Platform, StatusBar, useColorScheme, View } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import usePushNotifications from '../hooks/usePushNotifications';
import DynamicIsland from '../components/DynamicIsland';
// import useLiveActivitySync from '../hooks/useLiveActivitySync';
import { fetchAddresses, fetchMe } from '../store/authSlice';
import { fetchOrders } from '../store/ordersSlice';
import { updatePushToken } from '../src/api';
import BottomBar from './components/BottomBar';
// import AiAssistantFAB from '../components/AiAssistantFAB';
// import AiChatSheet from '../components/AiChatSheet';

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
  const pathname = usePathname();

  // Define screens that should display the BottomBar
  const mainScreens = ['/home', '/catalog', '/favorites', '/cart', '/orders', '/profile', '/courier'];
  const showBottomBar = mainScreens.includes(pathname);

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
            
            {/* <AiAssistantFAB /> */}
            {/* <AiChatSheet /> */}
            <DynamicIsland />
            <AppStartup />
          </View>
        </PersistGate>
      </Provider>
    </SafeAreaProvider>
  );
}