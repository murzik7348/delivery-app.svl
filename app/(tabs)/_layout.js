import { Tabs } from 'expo-router';
import React from 'react';
import { Platform, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Colors from '../../constants/Colors';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#e334e3', // Твій фіолетовий колір
        tabBarInactiveTintColor: 'gray',
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: Platform.OS === 'ios' ? 85 : 60,
          paddingBottom: Platform.OS === 'ios' ? 30 : 10,
        },
      }}>
      
      {/* 1. ГОЛОВНА */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Головна',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'home' : 'home-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 2. КАТАЛОГ (Замість пошуку) */}
      <Tabs.Screen
        name="catalog"
        options={{
          title: 'Каталог',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 3. ПРОФІЛЬ */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Профіль',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'person' : 'person-outline'} size={24} color={color} />
          ),
        }}
      />

      {/* 👇 Приховуємо старий файл пошуку, якщо ти його ще не видалив, щоб не було двох кнопок */}
      <Tabs.Screen
        name="search"
        options={{
          href: null, 
        }}
      />
      
    </Tabs>
  );
}