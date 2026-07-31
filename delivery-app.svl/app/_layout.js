import { Stack, usePathname, useRouter, useSegments } from "expo-router";
import { Provider } from "react-redux";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { store, persistor } from "../store";
import { Platform, StatusBar, View, NativeModules, Text } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';

try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  // Silent fallback
}

import { useColorScheme } from '../hooks/use-color-scheme';
import { PersistGate } from 'redux-persist/integration/react';
import { useEffect, useState, useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Constants from 'expo-constants';
import usePushNotifications from '../hooks/usePushNotifications';
// import useLiveActivitySync from '../hooks/useLiveActivitySync';
import { fetchAddresses, fetchMe } from '../store/authSlice';
import { fetchOrders } from '../store/ordersSlice';
import { fetchCatalog } from '../store/catalogSlice';
import { updatePushToken, getToken } from '../src/api';
import BottomBar from '../components/BottomBar';
import DynamicIsland from '../components/DynamicIsland';
import OfflineBanner from '../components/OfflineBanner';
// import AiAssistantFAB from '../components/AiAssistantFAB';
// import AiChatSheet from '../components/AiChatSheet';
import { useAppFonts } from '../utils/fonts';

// ── Global AppText as default for ALL <Text> components ────────────────────
// Intercepts and patches Text.render dynamically so all standard <Text> components
// automatically support variant="body|heading|caption|button" and apply Inter.
import { StyleSheet } from 'react-native';

const variantStyles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
  },
});

function getFontFamily(variant, style) {
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return flat.fontFamily;

  const weight = flat.fontWeight;
  if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
    return 'Inter_700Bold';
  }
  if (weight === '600') {
    return 'Inter_600SemiBold';
  }
  if (weight === '500') {
    return 'Inter_500Medium';
  }

  if (variant === 'heading') return 'Inter_600SemiBold';
  if (variant === 'button') return 'Inter_500Medium';
  return 'Inter_400Regular';
}

try {
  if (Text.defaultProps == null) Text.defaultProps = {};
  Text.defaultProps.allowFontScaling = false;
  Text.defaultProps.maxFontSizeMultiplier = 1;

  const { TextInput } = require('react-native');
  if (TextInput.defaultProps == null) TextInput.defaultProps = {};
  TextInput.defaultProps.allowFontScaling = false;
  TextInput.defaultProps.maxFontSizeMultiplier = 1;

  if (Text.render) {
    const originalRender = Text.render;
    Text.render = function (props, ref) {
      const { variant = 'body', style, ...rest } = props;
      const variantStyle = variantStyles[variant] || variantStyles.body;
      const fontFamily = getFontFamily(variant, style);

      // Clean up fontWeight on Android to prevent double bolding issues
      const cleanStyle = { ...(StyleSheet.flatten(style) || {}) };
      if (Platform.OS === 'android' && fontFamily !== 'Inter_400Regular') {
        delete cleanStyle.fontWeight;
      }

      return originalRender.call(this, {
        allowFontScaling: false,
        maxFontSizeMultiplier: 1,
        ...rest,
        style: [
          variantStyle,
          { fontFamily },
          cleanStyle,
        ],
      }, ref);
    };
  } else {
    Text.defaultProps.style = [
      { fontFamily: 'Inter_400Regular' },
      Text.defaultProps.style,
    ];
  }
} catch (e) {
  console.warn('[Layout] Failed to patch Text.render:', e);
}


// Helper to get Firebase Auth only when safe
const getFirebaseAuth = () => {
  if (Constants.appOwnership === 'expo') return null;
  if (!NativeModules.RNFBAuthModule) return null;
  try {
    return require('@react-native-firebase/auth').getAuth;
  } catch (e) {
    return null;
  }
};

function AppStartup() {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(s => s.auth?.isAuthenticated);
  const { expoPushToken } = usePushNotifications();
  const router = useRouter();
  const segments = useSegments();
  const pathname = usePathname();

  useEffect(() => {
    try {
      const getAuthFn = getFirebaseAuth();
      if (getAuthFn) {
        const authInstance = getAuthFn();
        console.log("🔥 [Firebase Test] Auth status: initialized successfully. Current user:", authInstance.currentUser ? authInstance.currentUser.uid : "None");
      } else {
        console.log("⚠️ [Firebase Test] Firebase Auth is not available (running in Expo Go or native module not compiled).");
      }
    } catch (e) {
      console.error("❌ [Firebase Test] Failed to initialize Auth:", e);
    }
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        dispatch(fetchMe());
      }
    })();
    dispatch(fetchCatalog());
  }, [dispatch]);

  // Global Auth Guard
  useEffect(() => {
    let interval;
    if (isAuthenticated) {
      dispatch(fetchMe());
      dispatch(fetchAddresses());
      dispatch(fetchOrders());
      // fetchCatalog is already dispatched on startup — condition guard prevents duplicates

      // Poll order status every 30 seconds
      interval = setInterval(() => {
        dispatch(fetchOrders());
      }, 30000);
    } else {
      // If NOT authenticated, redirect to login only if trying to access a protected screen
      const protectedScreens = ['/orders', '/profile', '/favorites', '/profile-edit'];
      const isProtected = protectedScreens.some(screen => pathname.startsWith(screen));
      const inAuthGroup = segments[0] === '(auth)';
      if (isProtected && !inAuthGroup) {
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
      let isSubscribed = true;
      const syncToken = async () => {
        try {
          await updatePushToken(expoPushToken);
          console.log("✅ [Push] Push Token synced successfully.");
        } catch (err) {
          console.warn('⚠️ [Push] Failed to sync push token, retrying in 3s...', err.message || err);
          setTimeout(async () => {
            if (isSubscribed) {
              await updatePushToken(expoPushToken).catch(retryErr => {
                console.error('❌ [Push] Push token sync failed on retry:', retryErr.message || retryErr);
              });
            }
          }, 3000);
        }
      };
      syncToken();
      return () => { isSubscribed = false; };
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
  const { fontsLoaded, fontError } = useAppFonts();

  const pathname = usePathname();
  const mainScreens = ['/home', '/catalog', '/favorites', '/cart', '/orders', '/profile'];
  const showBottomBar = mainScreens.includes(pathname);

  const [transitionAnimation, setTransitionAnimation] = useState('slide_from_right');
  const prevPathname = useRef(pathname);

  useEffect(() => {
    const prevIdx = mainScreens.indexOf(prevPathname.current);
    const newIdx = mainScreens.indexOf(pathname);

    if (prevIdx !== -1 && newIdx !== -1 && prevIdx !== newIdx) {
      setTransitionAnimation('none');
    } else {
      // Fallback for standard pushes/pops outside of tab bar
      setTransitionAnimation(Platform.OS === 'ios' ? 'default' : 'slide_from_right');
    }
    prevPathname.current = pathname;
  }, [pathname]);

  // Block render until fonts are ready (SplashScreen is still showing via useAppFonts)
  if (!fontsLoaded && !fontError) return null;

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
              animation: transitionAnimation,
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