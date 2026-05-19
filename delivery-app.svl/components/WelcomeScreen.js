import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Animated, StatusBar, Dimensions } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';

const { width: screenWidth } = Dimensions.get('window');
const logoSize = Math.min(screenWidth * 0.65, 260);

export default function WelcomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const logoScale = useRef(new Animated.Value(0.4)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Premium spring animation on mount to give it a polished feel
    Animated.parallel([
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 12,
        friction: 6,
        useNativeDriver: true,
      }),
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const bgColor = isDark ? '#171717' : '#F14FF1';
  const logoSource = isDark 
    ? require('../assets/images/logo_dark.png') 
    : require('../assets/images/logo_light.png');

  return (
    <View style={[styles.container, { backgroundColor: bgColor }]}>
      <StatusBar barStyle="light-content" backgroundColor={bgColor} />
      <Animated.Image
        source={logoSource}
        style={[
          styles.logo,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logo: {
    width: logoSize,
    height: logoSize,
  },
});
