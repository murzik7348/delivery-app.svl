import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Modal, Dimensions, Animated, Easing, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function FakeApplePayModal({ visible, amount, onPaymentSuccess, onClose }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    // States
    const [step, setStep] = useState('initial'); // 'initial' | 'processing' | 'success'

    // Animations
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;
    const checkmarkScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            setStep('initial');
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();

            // Start pulsing Face ID icon
            Animated.loop(
                Animated.sequence([
                    Animated.timing(pulseAnim, {
                        toValue: 1.2,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    }),
                    Animated.timing(pulseAnim, {
                        toValue: 1,
                        duration: 800,
                        easing: Easing.inOut(Easing.ease),
                        useNativeDriver: true,
                    })
                ])
            ).start();

        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const handleDoubleTap = () => {
        if (step !== 'initial') return;

        setStep('processing');
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        setTimeout(() => {
            setStep('success');
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

            Animated.spring(checkmarkScale, {
                toValue: 1,
                friction: 5,
                tension: 40,
                useNativeDriver: true,
            }).start();

            setTimeout(() => {
                onPaymentSuccess();
            }, 1500);

        }, 2000); // Fake 2 seconds processing
    };

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="fade">
            <View style={styles.backdrop}>

                <Animated.View
                    style={[
                        styles.sheet,
                        {
                            backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF',
                            transform: [{ translateY: slideAnim }]
                        }
                    ]}
                >
                    {/* Main Content */}
                    <View style={styles.content}>

                        <View style={styles.header}>
                            <Text style={[styles.payTitle, { color: isDark ? 'white' : 'black' }]}>Pay</Text>
                            <TouchableOpacity onPress={onClose}>
                                <Text style={{ color: '#007AFF', fontSize: 17, fontWeight: '600' }}>Cancel</Text>
                            </TouchableOpacity>
                        </View>

                        <View style={styles.amountContainer}>
                            <Text style={[styles.storeName, { color: isDark ? '#EBEBF5' : '#8E8E93' }]}>SVL Dodo Pizza</Text>
                            <Text style={[styles.amountText, { color: isDark ? 'white' : 'black' }]}>{amount} ₴</Text>
                        </View>

                        <View style={[styles.cardRow, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }]}>
                            <Ionicons name="card" size={24} color={isDark ? 'white' : 'black'} />
                            <View style={{ marginLeft: 12, flex: 1 }}>
                                <Text style={{ color: isDark ? 'white' : 'black', fontWeight: '500', fontSize: 16 }}>Apple Pay</Text>
                                <Text style={{ color: 'gray', fontSize: 13 }}>Mastercard •••• 4242</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="gray" />
                        </View>

                    </View>

                    {/* Bottom Action Area */}
                    <View style={styles.actionArea}>
                        {step === 'initial' && (
                            <View style={styles.faceIdContainer}>
                                <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
                                    <Ionicons name="scan-outline" size={42} color="#007AFF" />
                                </Animated.View>
                                <Text style={[styles.instructionText, { color: isDark ? 'white' : 'black' }]}>
                                    Double-Click to Pay
                                </Text>

                                {/* Invisible huge button across the whole bottom to simulate the hardware double tap for testing */}
                                <TouchableOpacity
                                    style={styles.fakeDoubleTapBtn}
                                    onPress={handleDoubleTap}
                                    activeOpacity={0.9}
                                >
                                    <Text style={{ color: 'white', fontWeight: 'bold' }}>TAP TO SIMULATE DOUBLE CLICK</Text>
                                </TouchableOpacity>
                            </View>
                        )}

                        {step === 'processing' && (
                            <View style={styles.faceIdContainer}>
                                <Ionicons name="scan-outline" size={42} color="gray" />
                                <Text style={[styles.instructionText, { color: 'gray' }]}>Processing...</Text>
                            </View>
                        )}

                        {step === 'success' && (
                            <View style={styles.faceIdContainer}>
                                <Animated.View style={{ transform: [{ scale: checkmarkScale }] }}>
                                    <Ionicons name="checkmark-circle" size={54} color="#34C759" />
                                </Animated.View>
                                <Text style={[styles.instructionText, { color: isDark ? 'white' : 'black', marginTop: 8 }]}>Done</Text>
                            </View>
                        )}
                    </View>

                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    sheet: {
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingBottom: 40,
        minHeight: 380,
    },
    content: {
        padding: 24,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    payTitle: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    amountContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    storeName: {
        fontSize: 15,
        marginBottom: 8,
    },
    amountText: {
        fontSize: 42,
        fontWeight: '600',
    },
    cardRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 14,
    },
    actionArea: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 20,
        height: 120,
    },
    faceIdContainer: {
        alignItems: 'center',
    },
    instructionText: {
        fontSize: 16,
        fontWeight: '500',
        marginTop: 12,
    },
    fakeDoubleTapBtn: {
        marginTop: 15,
        backgroundColor: '#007AFF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 20,
    }
});
