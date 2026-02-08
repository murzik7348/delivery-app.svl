import { Stack } from "expo-router";
import { Provider } from "react-redux";
import { store } from "../store/store"; 
import { useColorScheme } from 'react-native';
import { usePushNotifications } from '../hooks/usePushNotifications'; // 👈 1. ІМПОРТ

export default function RootLayout() {
  
  const { expoPushToken } = usePushNotifications();
  
  
  console.log("Токен працює:", expoPushToken);

  const colorScheme = useColorScheme();

  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        {/* Інші екрани */}
      </Stack>
    </Provider>
  );
}