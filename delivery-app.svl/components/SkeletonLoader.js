import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, Dimensions } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import Colors from '../constants/Colors';

const { width } = Dimensions.get('window');

export default function SkeletonLoader({ style, width: customWidth, height: customHeight, borderRadius: customRadius = 16 }) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const opacityAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacityAnim, {
          toValue: 0.7,
          duration: 700,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.3,
          duration: 700,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [opacityAnim]);

  const bg = isDark ? '#2c2c2e' : '#e5e5ea';

  return (
    <Animated.View
      style={[
        {
          backgroundColor: bg,
          width: customWidth ?? '100%',
          height: customHeight ?? 120,
          borderRadius: customRadius,
          opacity: opacityAnim,
        },
        style,
      ]}
    />
  );
}

export function StoreSkeletonList() {
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
      <SkeletonLoader height={190} borderRadius={24} style={{ marginBottom: 16 }} />
      <SkeletonLoader height={190} borderRadius={24} style={{ marginBottom: 16 }} />
    </View>
  );
}
