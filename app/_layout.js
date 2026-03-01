import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store, persistor } from "../store";
import { useColorScheme } from 'react-native';
import { PersistGate } from 'redux-persist/integration/react';
import usePushNotifications from '../hooks/usePushNotifications';
import DynamicIsland from '../components/DynamicIsland';
import useLiveActivitySync from '../hooks/useLiveActivitySync';

/**
 * A headless component that runs the custom hook globally.
 * It must be mounted *inside* the Provider so it can access Redux.
 */
function LiveActivityManager() {
  useLiveActivitySync();
  return null;
}

export default function RootLayout() {

  const { expoPushToken } = usePushNotifications();

  console.log("Токен працює:", expoPushToken);

  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
          {/* Інші екрани */}
        </Stack>
        <DynamicIsland />
        <LiveActivityManager />
      </PersistGate>
    </Provider>
  );
}