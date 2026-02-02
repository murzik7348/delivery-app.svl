import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { Platform, useColorScheme } from 'react-native';

export default function TabLayout() {
  // Визначаємо тему прямо тут
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // Налаштування кольорів
  const activeColor = '#e334e3'; // Наш фіолетовий
  const inactiveColor = isDark ? '#888888' : '#999999'; // Сірий для неактивних
  
  // 🔥 ФОН МЕНЮ: 
  // Якщо темно -> Світло-сірий (щоб виділявся на чорному)
  // Якщо світло -> Білий
  const barBackground = isDark ? '#252525' : '#ffffff'; 

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: activeColor,
        tabBarInactiveTintColor: inactiveColor,
        tabBarShowLabel: true, // Показуємо підписи

        tabBarStyle: {
          backgroundColor: barBackground,
          borderTopWidth: 0, // Без ліній зверху
          elevation: 0,      // Без тіні на Android (плоский вигляд)
          height: Platform.OS === 'ios' ? 85 : 65,
          paddingBottom: Platform.OS === 'ios' ? 25 : 10,
          paddingTop: 10,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: 'bold',
          marginBottom: 0
        }
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "home" : "home-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Пошук',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "search" : "search-outline"} size={26} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? "person" : "person-outline"} size={26} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}