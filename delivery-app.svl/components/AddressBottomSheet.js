import React, { useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    Platform,
    Dimensions,
    Animated,
    PanResponder,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { setDeliveryType } from '../store/cartSlice';
import { setCurrentLocation } from '../store/locationSlice';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.55;

export default function AddressBottomSheet({ visible, onClose }) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const dispatch = useDispatch();
    const savedAddresses = useSelector((s) => s.auth?.addresses || []);
    const { currentLocation } = useSelector((s) => s.location);
    const activeAddressText = currentLocation?.addressName || (savedAddresses.length > 0 ? savedAddresses[0].address : null);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const activeScale = useRef(new Animated.Value(1)).current;

    const handleDismiss = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderGrant: () => {
                translateY.stopAnimation();
                Animated.spring(activeScale, { toValue: 1.3, friction: 8, useNativeDriver: true }).start();
            },
            onPanResponderMove: (_, gestureState) => {
                const dy = gestureState.dy;
                if (dy > 0) {
                    translateY.setValue(dy);
                } else {
                    translateY.setValue(dy * 0.25);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                if (gestureState.vy > 0.5 || gestureState.dy > SHEET_HEIGHT * 0.35) {
                    handleDismiss();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    useEffect(() => {
        if (visible) {
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            translateY.setValue(SCREEN_HEIGHT);
        }
    }, [visible]);

    return (
        <Modal
            animationType="none"
            transparent
            visible={visible}
            onRequestClose={handleDismiss}
        >
            <Animated.View 
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: 'rgba(0,0,0,0.4)',
                        opacity: translateY.interpolate({
                            inputRange: [0, SCREEN_HEIGHT],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        })
                    }
                ]}
            >
                <TouchableOpacity activeOpacity={1} onPress={handleDismiss} style={StyleSheet.absoluteFill} />
            </Animated.View>

            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        styles.sheet, 
                        { 
                            backgroundColor: theme.card,
                            transform: [{ translateY }]
                        }
                    ]}
                >
                    {/* Хендл-зона */}
                    <View style={styles.dragHandleArea}>
                        <Animated.View 
                            style={[
                                styles.pill,
                                {
                                    transform: [
                                        { scaleX: activeScale },
                                        { scaleY: activeScale }
                                    ]
                                }
                            ]} 
                        />
                    </View>
                    <Text style={[styles.title, { color: theme.text }]}>Адреса доставки</Text>

                    {savedAddresses && savedAddresses.length > 0 ? (
                        savedAddresses.map((addr, i) => {
                            const isSelected = addr.address === activeAddressText;
                            return (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.addressRow,
                                        {
                                            backgroundColor: theme.input,
                                            borderColor: isSelected ? theme.primary : 'rgba(0,0,0,0.05)',
                                            borderWidth: isSelected ? 1.5 : StyleSheet.hairlineWidth
                                        }
                                    ]}
                                    onPress={() => {
                                        dispatch(setDeliveryType('delivery'));
                                        dispatch(setCurrentLocation({
                                            latitude: addr.latitude,
                                            longitude: addr.longitude,
                                            addressName: addr.address,
                                            name: addr.name || addr.title || null,
                                        }));
                                        handleDismiss();
                                    }}
                                >
                                    <Ionicons name="location-outline" size={20} color={theme.primary} />
                                    <Text style={[styles.addressText, { color: theme.text, fontWeight: isSelected ? '700' : '500' }]} numberOfLines={2}>
                                        {addr.address || [
                                            addr.title,
                                            addr.house ? `буд. ${addr.house}` : '',
                                            addr.apartment ? `кв. ${addr.apartment}` : ''
                                        ].filter(Boolean).join(', ')}
                                    </Text>
                                    {isSelected && (
                                        <Ionicons name="checkmark-circle" size={20} color={theme.primary} />
                                    )}
                                </TouchableOpacity>
                            );
                        })
                    ) : (
                        <Text style={[styles.noAddress, { color: 'gray' }]}>
                            Збережених адрес немає
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.addBtnAction, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
                        onPress={() => {
                            handleDismiss();
                            router.push('/location-picker');
                        }}
                    >
                        <Ionicons name="add-circle" size={22} color="white" />
                        <Text style={[styles.addBtnText, { color: 'white' }]}>Додати адресу</Text>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 0,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 10 }
        })
    },
    pill: {
        width: 48,
        height: 5,
        backgroundColor: '#C6C6CC',
        borderRadius: 2.5,
    },
    dragHandleArea: {
        width: '100%',
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginTop: 6,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        gap: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 1 }
        })
    },
    addressText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    noAddress: {
        fontSize: 15,
        marginBottom: 16,
    },
    addBtnAction: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 15,
        backgroundColor: '#000000',
        borderRadius: 12,
        padding: 12,
        ...Platform.select({
            ios: { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 4 }
        })
    },
    addBtnText: {
        color: 'white',
        fontSize: 15,
        fontWeight: '600',
    },
});