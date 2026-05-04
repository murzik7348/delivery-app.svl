import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, PanResponder, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width } = Dimensions.get('window');
const BUTTON_WIDTH = width - 40; // Assuming 20px padding on each side
const BUTTON_HEIGHT = 60;
const SWIPE_THRESHOLD = BUTTON_WIDTH * 0.75;

export default function SwipeButton({ onSwipeSuccess, title, icon = "arrow-forward", color = "#e334e3", isDark = false, isLoading = false }) {
    const pan = useRef(new Animated.ValueXY()).current;
    const [swiped, setSwiped] = useState(false);
    
    // Create a ref for the callback to always use the latest one
    const successCallbackRef = useRef(onSwipeSuccess);
    successCallbackRef.current = onSwipeSuccess;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => !swiped && !isLoading,
            onPanResponderMove: (e, gesture) => {
                if (gesture.dx > 0 && gesture.dx < BUTTON_WIDTH - BUTTON_HEIGHT) {
                    pan.setValue({ x: gesture.dx, y: 0 });
                }
            },
            onPanResponderRelease: (e, gesture) => {
                if (gesture.dx >= SWIPE_THRESHOLD) {
                    // Success swipe
                    Animated.spring(pan, {
                        toValue: { x: BUTTON_WIDTH - BUTTON_HEIGHT, y: 0 },
                        useNativeDriver: false,
                        bounciness: 0,
                    }).start(() => {
                        setSwiped(true);
                        // Use the ref to call the LATEST callback
                        if (successCallbackRef.current) {
                            successCallbackRef.current();
                            // Reset after a delay if it's a long process
                            setTimeout(() => {
                                setSwiped(false);
                                pan.setValue({ x: 0, y: 0 });
                            }, 2000);
                        }
                    });
                } else {
                    // Snap back
                    Animated.spring(pan, {
                        toValue: { x: 0, y: 0 },
                        useNativeDriver: false,
                        bounciness: 10,
                    }).start();
                }
            },
        })
    ).current;

    const interpolatedWidth = pan.x.interpolate({
        inputRange: [0, SWIPE_THRESHOLD],
        outputRange: [BUTTON_HEIGHT, BUTTON_WIDTH],
        extrapolate: 'clamp'
    });

    return (
        <View style={[styles.container, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', borderColor: color, borderWidth: 1 }]}>
            <Animated.View style={[styles.progressOverlay, { backgroundColor: color + '40', width: interpolatedWidth }]} />
            <Text style={[styles.title, { color: isDark ? 'white' : 'black' }]}>
                {isLoading ? '...' : title}
            </Text>

            <Animated.View
                style={[
                    styles.swipeableBtn,
                    { backgroundColor: color },
                    { transform: [{ translateX: pan.x }] }
                ]}
                {...panResponder.panHandlers}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Ionicons name={swiped ? "checkmark" : icon} size={28} color="white" />
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        width: '100%',
        height: BUTTON_HEIGHT,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BUTTON_HEIGHT / 2,
        overflow: 'hidden',
        marginVertical: 8,
    },
    progressOverlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: BUTTON_HEIGHT / 2,
    },
    title: {
        fontSize: 16,
        fontWeight: 'bold',
        position: 'absolute',
        zIndex: 1,
        pointerEvents: 'none',
    },
    swipeableBtn: {
        position: 'absolute',
        left: 0,
        height: BUTTON_HEIGHT,
        width: BUTTON_HEIGHT,
        borderRadius: BUTTON_HEIGHT / 2,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 2,
        shadowColor: '#000',
        shadowOpacity: 0.3,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 0 },
        elevation: 5,
    }
});