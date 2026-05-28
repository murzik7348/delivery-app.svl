import React, { useEffect, useRef } from 'react';
import { StyleSheet, Text, Animated, View, Platform } from 'react-native';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

export default function OfflineBanner() {
    const isOffline = useSelector((state) => state.ui?.isOffline ?? false);
    const slideAnim = useRef(new Animated.Value(-100)).current;

    useEffect(() => {
        Animated.spring(slideAnim, {
            toValue: isOffline ? 0 : -100,
            tension: 50,
            friction: 8,
            useNativeDriver: true,
        }).start();
    }, [isOffline]);

    const Container = Platform.OS === 'ios' ? BlurView : View;
    const containerProps = Platform.OS === 'ios' ? { intensity: 85, tint: 'dark' } : {};

    return (
        <Animated.View
            style={[
                styles.wrapper,
                { transform: [{ translateY: slideAnim }] },
                Platform.OS !== 'ios' && styles.androidFallback,
            ]}
        >
            <Container {...containerProps} style={styles.container}>
                <Ionicons name="cloud-offline-outline" size={20} color="#FF5252" />
                <Text style={styles.text}>Офлайн-режим. Перевірте з'єднання.</Text>
            </Container>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        top: Platform.OS === 'ios' ? 50 : 16,
        left: 16,
        right: 16,
        zIndex: 99999,
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
        ...Platform.select({
            ios: {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: 0.3,
                shadowRadius: 20,
            },
            android: {
                elevation: 8,
            },
        }),
    },
    androidFallback: {
        backgroundColor: 'rgba(28, 28, 30, 0.96)',
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 18,
        gap: 12,
    },
    text: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif-medium',
        flex: 1,
        letterSpacing: -0.2,
    },
});
