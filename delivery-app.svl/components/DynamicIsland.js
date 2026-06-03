import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform, TouchableOpacity, Image, Linking } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { hideDynamicIsland } from '../store/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const { width } = Dimensions.get('window');

// ── Helper: map status string to numeric step ─────────────────────────
function statusToStep(status) {
    if (typeof status === 'number') return status;
    const s = String(status ?? '').toLowerCase();
    if (s === '6' || s === 'canceled') return 6;
    if (s === '5' || s === 'delivered' || s === 'completed') return 5;
    if (s === '4' || s === 'delivering' || s === 'picked_up') return 4;
    if (s === '3' || s === 'ready_for_pickup') return 3;
    if (s === '2' || s === 'preparing') return 2;
    if (s === '1' || s === 'accepted') return 1;
    return 0;
}

// ── Pulsing live indicator dot ─────────────────────────────────────────
function LiveDot({ color = '#27ae60' }) {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 1.5, duration: 600, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1,   duration: 600, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <Animated.View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, transform: [{ scale: anim }] }} />
    );
}

export default function DynamicIsland() {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const router = useRouter();
    
    // Dynamic Island notification state
    const island = useSelector((state) => state.ui?.dynamicIsland) || {};
    const { visible = false, title = '', message = '', icon = 'checkmark-circle', type = 'success' } = island;

    // Active order tracking (for persistent pill)
    const { user } = useSelector((state) => state.auth);
    const userRole = user?.role?.toLowerCase();
    const isUserCourier = userRole === 'courier' || userRole === 'курєр' || Number(user?.role) === 1;

    const courierActiveOrders = useSelector((state) => state.courier?.activeOrders || []);
    const clientOrders = useSelector((state) => state.orders?.orders || []);
    
    // Find the most relevant active order (prioritize delivering)
    const allActive = [...courierActiveOrders, ...clientOrders].filter(o => {
        const step = statusToStep(o.status);
        return step >= 1 && step <= 4;
    });
    
    // Sort so delivering (4) is first
    allActive.sort((a, b) => statusToStep(b.status) - statusToStep(a.status));
    const activeOrder = allActive[0];

    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            if (Platform.OS !== 'web') {
                Haptics.notificationAsync(
                    type === 'error' ? Haptics.NotificationFeedbackType.Error : Haptics.NotificationFeedbackType.Success
                );
            }
            Animated.spring(animValue, { toValue: 1, friction: 8, tension: 40, useNativeDriver: false }).start();
            const timer = setTimeout(closeIsland, 4000);
            return () => clearTimeout(timer);
        } else {
            Animated.timing(animValue, { toValue: 0, duration: 400, useNativeDriver: false }).start();
        }
    }, [visible]);

    const closeIsland = () => {
        dispatch(hideDynamicIsland());
    };

    // If nothing to show at all
    if (!visible && !activeOrder) return null;

    // Persistent pill logic: show if not in notification mode
    const isPillMode = !visible && !!activeOrder;

    const islandWidth = animValue.interpolate({ 
        inputRange: [0, 1], 
        outputRange: [isPillMode ? 240 : 120, width * 0.94] 
    });
    const islandHeight = animValue.interpolate({ 
        inputRange: [0, 1], 
        outputRange: [isPillMode ? 44 : 37, 78] 
    });
    const contentOpacity = animValue.interpolate({ 
        inputRange: [0, 0.7, 1], 
        outputRange: [0, 0, 1] 
    });

    let iconColor = theme.primary;
    if (type === 'success') iconColor = '#4cd964';
    if (type === 'error')   iconColor = '#ff3b30';
    if (type === 'info')    iconColor = '#5ac8fa';
    if (type === 'courier') iconColor = '#3498db';

    const topOffset = Platform.OS === 'ios' ? (insets.top || 44) : 10;

    return (
        <View style={[styles.wrapper, { top: topOffset }]} pointerEvents="box-none">
            <Animated.View style={[
                styles.container, 
                { 
                    width: islandWidth, 
                    height: islandHeight,
                    borderColor: isUserCourier && isPillMode ? 'rgba(226, 43, 198, 0.6)' : 'rgba(255,255,255,0.15)',
                    borderWidth: isUserCourier && isPillMode ? 1.2 : 0.8
                }
            ]}>
                {/* 1. NOTIFICATION CONTENT (Visible when expanded) */}
                {visible && (
                    <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                        <View style={styles.iconContainer}>
                            <View style={[styles.iconCircle, { backgroundColor: iconColor + '22' }]}>
                                <Ionicons name={icon || 'notifications'} size={26} color={iconColor} />
                            </View>
                        </View>
                        <View style={styles.textContainer}>
                            {!!title   && <Text style={styles.title}   numberOfLines={1}>{title}</Text>}
                            {!!message && <Text style={styles.message} numberOfLines={1}>{message}</Text>}
                        </View>
                    </Animated.View>
                )}

                {/* 2. PERSISTENT PILL CONTENT (Visible when idle but has order) */}
                {isPillMode && (
                    <TouchableOpacity 
                        style={styles.pillContent}
                        activeOpacity={0.8}
                        onPress={() => {
                            if (isUserCourier) {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                router.push('/courier');
                            } else {
                                const phone = activeOrder.courierPhone || activeOrder.courier?.phone;
                                if (phone) {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                    Linking.openURL(`tel:${phone.replace(/[^+\d]/g, '')}`);
                                }
                            }
                        }}
                    >
                        {/* Status Icon or Photo */}
                        {isUserCourier ? (
                            <View style={[styles.avatar, { backgroundColor: `${theme.primary}20`, borderColor: theme.primary }]}>
                                <Ionicons name={statusToStep(activeOrder.status) === 4 ? "navigate" : "restaurant"} size={14} color={theme.primary} />
                            </View>
                        ) : (activeOrder.courierPhoto || activeOrder.courier?.photo) ? (
                            <Image source={{ uri: activeOrder.courierPhoto || activeOrder.courier?.photo }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, { backgroundColor: '#3498db' }]}>
                                <Ionicons name={statusToStep(activeOrder.status) === 4 ? "bicycle" : "restaurant"} size={14} color="white" />
                            </View>
                        )}
                        
                        <View style={{ marginLeft: 8, flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={styles.pillTitle} numberOfLines={1}>
                                    {isUserCourier ? (
                                        statusToStep(activeOrder.status) === 4 ? 'Доставка клієнту' :
                                        statusToStep(activeOrder.status) === 3 ? 'Заберіть з ресторану' :
                                        'Замовлення готується'
                                    ) : (
                                        statusToStep(activeOrder.status) === 4 ? 'Кур\'єр їде' : 'Готується'
                                    )}
                                </Text>
                                <View style={{ marginLeft: 4 }}><LiveDot color={isUserCourier ? theme.primary : '#27ae60'} /></View>
                            </View>
                            <Text style={styles.pillSub} numberOfLines={1}>
                                {isUserCourier ? (
                                    statusToStep(activeOrder.status) === 4 ? activeOrder.address : activeOrder.restaurantName
                                ) : (
                                    activeOrder.navigationStats?.toClientDistance || 'Замовлення в роботі'
                                )}
                            </Text>
                        </View>
                        
                        {isUserCourier ? (
                            activeOrder.customerPhone && (
                                <TouchableOpacity 
                                    onPress={(e) => {
                                        e.stopPropagation();
                                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                        Linking.openURL(`tel:${activeOrder.customerPhone.replace(/[^+\d]/g, '')}`);
                                    }}
                                    style={styles.callIconWrapper}
                                >
                                     <Ionicons name="call" size={15} color={theme.primary} />
                                </TouchableOpacity>
                            )
                        ) : (
                            (activeOrder.courierPhone || activeOrder.courier?.phone) && (
                                 <Ionicons name="call" size={16} color="#27ae60" style={{ marginRight: 4 }} />
                            )
                        )}
                    </TouchableOpacity>
                )}
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 99999, elevation: 99999 },
    container: {
        backgroundColor: '#000', borderRadius: 40, borderWidth: 0.8,
        borderColor: 'rgba(255,255,255,0.15)',
        shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 15,
        justifyContent: 'center', overflow: 'hidden',
    },
    content: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, width: '100%', height: '100%' },
    iconContainer: { marginRight: 12 },
    iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
    textContainer: { flex: 1, justifyContent: 'center' },
    title:   { color: '#fff',  fontSize: 15, fontWeight: '900', letterSpacing: -0.3 },
    message: { color: '#999', fontSize: 13, marginTop: 1, fontWeight: '500' },

    // Pill mode styles
    pillContent: { 
        flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: '100%', width: '100%' 
    },
    avatar: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', alignItems: 'center', justifyContent: 'center' },
    pillTitle: { color: '#fff', fontSize: 12, fontWeight: '800' },
    pillSub: { color: '#888', fontSize: 10, fontWeight: '600' },
});
