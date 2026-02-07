import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store';

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        {/* Головний екран тепер завантажується відразу */}
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="index" />

        {/* Модалки та інші екрани */}
        <Stack.Screen name="restaurant/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
        <Stack.Screen name="favorites" />
        <Stack.Screen name="location-picker" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="orders" /> 
      </Stack>
    </Provider>
  );
}
////fye ntcn cjuju yjdjuj gslfhfc f