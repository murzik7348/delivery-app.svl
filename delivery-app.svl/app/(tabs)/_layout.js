import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';
import { useSelector } from 'react-redux';
import { View, Text, StyleSheet } from 'react-native';
import { t } from '../../constants/translations';
import AiAssistantFAB from '../../components/AiAssistantFAB';
import AiChatSheet from '../../components/AiChatSheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function CartBadge({ color, focused }) {
  const cartItems = useSelector((s) => s.cart.items);
  const count = cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);
  return (
    <View>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function CourierBadge({ color, focused }) {
  const availableOrders = useSelector((s) => s.courier.availableOrders || []);
  const count = availableOrders.length;
  return (
    <View>
      <Ionicons name={focused ? 'bicycle' : 'bicycle-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: '#2ecc71' }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute', top: -4, right: -6,
    backgroundColor: '#e334e3', borderRadius: 8,
    minWidth: 16, height: 16,
    justifyContent: 'center', alignItems: 'center', paddingHorizontal: 2,
  },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },
});

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useSelector(state => state.auth);
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1 }}>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#e334e3',
          tabBarInactiveTintColor: 'gray',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: theme.background,
            borderTopColor: theme.border,
            // Android: add extra height for the system gesture/button nav bar
            height: Platform.OS === 'ios' ? 85 : 60 + insets.bottom,
            paddingBottom: Platform.OS === 'ios' ? 30 : Math.max(insets.bottom, 8) + 8,
            paddingTop: 6,
          },
        }}>

        <Tabs.Screen
          name="index"
          options={{
            title: t(locale, 'home'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="catalog"
          options={{
            title: t(locale, 'catalog'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="favorites"
          options={{
            title: t(locale, 'favorites'),
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? 'heart' : 'heart-outline'} size={24} color={color} />
            ),
          }}
        />

        <Tabs.Screen
          name="cart"
          options={{
            title: t(locale, 'cart'),
            tabBarIcon: ({ color, focused }) => (
              <CartBadge color={color} focused={focused} />
            ),
          }}
        />
        
        <Tabs.Screen
          name="courier"
          options={{
            title: locale === 'en' ? 'Delivery' : 'Доставка',
            // Hide tab for non-couriers
            href: (user?.role?.toLowerCase() === 'courier' || user?.role?.toLowerCase() === 'курєр' || Number(user?.role) === 1) ? undefined : null,
            tabBarIcon: ({ color, focused }) => (
              <CourierBadge color={color} focused={focused} />
            ),
          }}
        />

        <Tabs.Screen name="profile" options={{ href: null }} />
        <Tabs.Screen name="search" options={{ href: null }} />
      </Tabs>

      <AiAssistantFAB />
      <AiChatSheet />
    </View>
  );
}