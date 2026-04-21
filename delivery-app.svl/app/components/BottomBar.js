import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, usePathname } from 'expo-router';
import { useSelector } from 'react-redux';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { t } from '../../constants/translations';

function CartBadge({ color, focused, count }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={focused ? 'cart' : 'cart-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function OrdersBadge({ color, focused, count }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={focused ? 'receipt' : 'receipt-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: '#3498db' }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

function CourierBadge({ color, focused, count }) {
  return (
    <View style={styles.iconContainer}>
      <Ionicons name={focused ? 'bicycle' : 'bicycle-outline'} size={24} color={color} />
      {count > 0 && (
        <View style={[styles.badge, { backgroundColor: '#2ecc71' }]}>
          <Text style={styles.badgeText}>{count > 9 ? '9+' : count}</Text>
        </View>
      )}
    </View>
  );
}

export default function BottomBar() {
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const user = useSelector(state => state.auth.user);
  const colorScheme = 'light'; // Standardizing or using dynamic if needed
  const theme = Colors[colorScheme];

  const cartItems = useSelector((s) => s.cart.items);
  const cartCount = cartItems.reduce((sum, i) => sum + (i.quantity || 1), 0);

  const orders = useSelector((s) => s.orders.orders || []);
  const activeOrdersCount = orders.filter(o => {
    const statusNum = Number(o.statusDelivery || o.status || 0);
    return statusNum > 0 && statusNum < 6;
  }).length;

  const availableCourierOrders = useSelector((s) => s.courier.availableOrders || []);
  const courierCount = availableCourierOrders.length;

  const isCourier = user?.role?.toLowerCase() === 'courier' || user?.role?.toLowerCase() === 'курєр' || Number(user?.role) === 1;

  // Define tabs
  const tabs = [
    { name: 'home', route: '/home', icon: 'home', label: t(locale, 'home') },
    { name: 'catalog', route: '/catalog', icon: 'grid', label: t(locale, 'catalog') },
    { name: 'favorites', route: '/favorites', icon: 'heart', label: t(locale, 'favorites') },
    { name: 'cart', route: '/cart', icon: 'cart', label: t(locale, 'cart'), badge: cartCount, type: 'cart' },
    { name: 'orders', route: '/orders', icon: 'receipt', label: t(locale, 'myOrders'), badge: activeOrdersCount, type: 'orders' },
  ];

  if (isCourier) {
    tabs.push({ name: 'courier', route: '/courier', icon: 'bicycle', label: locale === 'en' ? 'Delivery' : 'Доставка', badge: courierCount, type: 'courier' });
  }

  const navigate = (route) => {
    // If it's already the current route, don't push
    if (pathname === route) return;
    
    // We use replace to keep the history flat like tabs, 
    // but the Stack transition will still perform the animation.
    router.replace(route);
  };

  return (
    <View style={[styles.container, { 
      backgroundColor: theme.background, 
      borderTopColor: theme.border,
      height: Platform.OS === 'ios' ? 85 : 65 + insets.bottom,
      paddingBottom: Platform.OS === 'ios' ? 25 : insets.bottom + 10,
    }]}>
      {tabs.map((tab) => {
        const focused = pathname === tab.route;
        const color = focused ? '#e334e3' : 'gray';

        let IconComponent = <Ionicons name={focused ? tab.icon : `${tab.icon}-outline`} size={24} color={color} />;
        
        if (tab.type === 'cart') IconComponent = <CartBadge color={color} focused={focused} count={tab.badge} />;
        if (tab.type === 'orders') IconComponent = <OrdersBadge color={color} focused={focused} count={tab.badge} />;
        if (tab.type === 'courier') IconComponent = <CourierBadge color={color} focused={focused} count={tab.badge} />;

        return (
          <TouchableOpacity 
            key={tab.name} 
            style={styles.tabItem} 
            onPress={() => navigate(tab.route)}
            activeOpacity={0.7}
          >
            {IconComponent}
            <Text style={[styles.label, { color }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingTop: 8,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
  label: {
    fontSize: 10,
    marginTop: 4,
    fontWeight: '500',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -10,
    backgroundColor: '#e334e3',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: 'white',
  },
  badgeText: {
    color: 'white',
    fontSize: 9,
    fontWeight: '900',
  },
});
