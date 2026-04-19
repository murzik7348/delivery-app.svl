import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Animated, StyleSheet, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { toggleAiChat } from '../store/aiSlice';

export default function AiAssistantFAB() {
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
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
                style={[styles.fab, { shadowColor: isDark ? '#e334e3' : '#000' }]}
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
        backgroundColor: '#e334e3',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        shadowOpacity: 0.3,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 },
        elevation: 8,
    }
});
