import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import Colors from '../constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { toggleAiChat } from '../store/aiSlice';

export default function AiAssistantFAB() {
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';

    const bounceAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // A subtle breathing animation for the AI FAB to attract attention softly
        Animated.loop(
            Animated.sequence([
                Animated.timing(bounceAnim, {
                    toValue: -5,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(bounceAnim, {
                    toValue: 0,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    return (
        <Animated.View style={[styles.container, { transform: [{ translateY: bounceAnim }] }]}>
            <TouchableOpacity
                style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                activeOpacity={0.8}
                onPress={() => dispatch(toggleAiChat(true))}
            >
                <Ionicons name="sparkles" size={28} color="white" />
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 90, // Above bottom tabs
        right: 20,
        zIndex: 9999, // Ensure it's visually above everything in the layout
    },
    fab: {
        backgroundColor: '#000000',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        ...Platform.select({
            ios: { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 8 },
        }),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(255,255,255,0.2)',
    }
});
