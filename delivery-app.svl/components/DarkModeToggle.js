import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, Pressable, Platform } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export default function DarkModeToggle({ initialState = true, onToggle, compact = false }) {
  const [isActive, setIsActive] = useState(initialState);
  const progress = useSharedValue(initialState ? 1 : 0);

  // Dimensions based on mode
  const width = compact ? 46 : 110;
  const height = compact ? 26 : 48;
  const borderRadius = compact ? 13 : 24;
  
  const leftBoundary = compact ? 3 : 6;
  const thumbSize = compact ? 20 : 36;
  const rightBoundary = compact ? 23 : 68; // width - leftBoundary - thumbSize

  useEffect(() => {
    progress.value = withSpring(initialState ? 1 : 0, {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    });
    setIsActive(initialState);
  }, [initialState]);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const nextState = !isActive;
    setIsActive(nextState);
    progress.value = withSpring(nextState ? 1 : 0, {
      damping: 12,
      stiffness: 100,
      mass: 0.8,
    });
    if (onToggle) {
      onToggle(nextState);
    }
  };

  const animatedThumbStyle = useAnimatedStyle(() => {
    // Liquid Switch Stretching Logic:
    // rightEdge starts moving immediately, finishes at 0.7
    const rightEdge = interpolate(
      progress.value,
      [0, 0.7],
      [leftBoundary + thumbSize, rightBoundary + thumbSize],
      Extrapolation.CLAMP
    );
    // leftEdge starts moving at 0.3, finishes at 1.0
    const leftEdge = interpolate(
      progress.value,
      [0.3, 1],
      [leftBoundary, rightBoundary],
      Extrapolation.CLAMP
    );

    return {
      left: leftEdge,
      width: rightEdge - leftEdge,
    };
  });

  const animatedDarkTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 0.7]),
      transform: [
        {
          translateX: interpolate(progress.value, [0, 1], [-10, 0]),
        },
      ],
    };
  });

  const animatedLightTextStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0.7, 0]),
      transform: [
        {
          translateX: interpolate(progress.value, [0, 1], [0, 10]),
        },
      ],
    };
  });

  const animatedIconStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { scale: interpolate(progress.value, [0, 1], [0.85, 1]) },
        { rotate: `${interpolate(progress.value, [0, 1], [-45, 0])}deg` },
      ],
    };
  });

  const animatedGlowStyle = useAnimatedStyle(() => {
    return {
      opacity: interpolate(progress.value, [0, 1], [0, 0.45]),
    };
  });

  return (
    <Pressable onPress={handlePress} style={styles.pressable}>
      <View style={[styles.container, { width, height, borderRadius }]}>
        {/* Subtle semi-transparent dark grey glass background */}
        <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
        <View style={[StyleSheet.absoluteFill, styles.fallbackOverlay]} />

        {/* Text labels: only shown in full/non-compact mode */}
        {!compact && (
          <>
            <Animated.View pointerEvents="none" style={[styles.textContainer, styles.leftText, animatedDarkTextStyle]}>
              <Text style={styles.text}>Dark</Text>
            </Animated.View>
            <Animated.View pointerEvents="none" style={[styles.textContainer, styles.rightText, animatedLightTextStyle]}>
              <Text style={styles.text}>Light</Text>
            </Animated.View>
          </>
        )}

        {/* Circular glass slider thumb with liquid stretch styling */}
        <Animated.View style={[styles.thumb, { height: thumbSize, borderRadius: thumbSize / 2 }, animatedThumbStyle]}>
          <BlurView intensity={75} tint="light" style={styles.thumbBlur}>
            {/* High-intensity glow backdrop inside the thumb in Dark Mode */}
            <Animated.View style={[styles.glowBackdrop, animatedGlowStyle]} />

            {/* Glowing sun/moon icon */}
            <Animated.View style={animatedIconStyle}>
              <Ionicons
                name={isActive ? "moon" : "sunny"}
                size={compact ? 12 : 18}
                color={isActive ? "#ffffff" : "#f1c40f"}
                style={styles.icon}
              />
            </Animated.View>
          </BlurView>
        </Animated.View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignSelf: 'center',
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    backgroundColor: 'rgba(20, 20, 20, 0.25)',
    position: 'relative',
    overflow: 'hidden',
  },
  fallbackOverlay: {
    backgroundColor: 'rgba(30, 30, 30, 0.25)',
  },
  textContainer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
  },
  leftText: {
    left: 16,
  },
  rightText: {
    right: 16,
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif',
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  thumb: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.25)',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: '#ffffff',
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  thumbBlur: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  glowBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  icon: {
    textShadowColor: 'rgba(255, 255, 255, 0.8)',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 10,
  },
});
