import { Stack } from 'expo-router';
import { Platform } from 'react-native';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      gestureEnabled: true,
      fullScreenGestureEnabled: true,
      animation: Platform.OS === 'ios' ? 'slide_from_right' : 'slide_from_left',
    }}>
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
    </Stack>
  );
}