import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import { store } from '../store';

<Stack screenOptions={{ headerShown: false }}>
        
        {/* 👇 ДОДАЛИ: animation: 'fade' або presentation: 'card' */}
        <Stack.Screen 
          name="(tabs)" 
          options={{ presentation: 'card', gestureEnabled: false }} 
        />
        
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="index" />

        {/* Модалки залишаються модалками */}
        <Stack.Screen name="restaurant/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
        
        {/* Інші екрани */}
        <Stack.Screen name="favorites" />
        <Stack.Screen name="location-picker" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="orders" /> 
      </Stack>

export default function RootLayout() {
  return (
    <Provider store={store}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="index" />
        <Stack.Screen name="restaurant/[id]" options={{ presentation: 'modal' }} />
        <Stack.Screen name="cart" options={{ presentation: 'modal' }} />
        <Stack.Screen name="orders" /> 
        <Stack.Screen name="profile-edit" />
        <Stack.Screen name="location-picker" />
      </Stack>
    </Provider>
  );
}