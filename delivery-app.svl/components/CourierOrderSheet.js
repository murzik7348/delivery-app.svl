import React, { useState, useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity,
    ScrollView, Image, Alert, Linking, Platform,
    Dimensions, Animated, PanResponder
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import Colors from '../constants/Colors';
import {
    courierAcceptOrderThunk,
    courierPickupOrderThunk,
    courierConfirmOrderThunk,
    fetchCourierOrders,
} from '../store/courierSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { formatPrice } from '../store/cartSlice';
import SwipeButton from './SwipeButton';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

// ── Status journey ──
const STEPS = [
    { num: 0, key: 'created',          icon: 'receipt-outline',  uk: 'Оформлено',  en: 'Created'    },
    { num: 1, key: 'accepted',         icon: 'checkmark-circle', uk: 'Прийнято',   en: 'Accepted'   },
    { num: 2, key: 'preparing',        icon: 'flame',            uk: 'Готується',  en: 'Preparing'  },
    { num: 3, key: 'ready_for_pickup', icon: 'bag-handle',       uk: 'Готово',     en: 'Ready'      },
    { num: 4, key: 'delivering',       icon: 'bicycle',          uk: 'В дорозі',   en: 'Delivering' },
    { num: 5, key: 'completed',        icon: 'home',             uk: 'Доставлено', en: 'Delivered'  },
    { num: 6, key: 'canceled',         icon: 'close-circle',     uk: 'Скасовано',  en: 'Canceled'   },
];

function statusToStep(val) {
    const v = String(val ?? '').toLowerCase();
    if (v === '6' || v === 'canceled'  || v === 'cancelled')    return 6;
    if (v === '5' || v === 'delivered' || v === 'completed')    return 5;
    if (v === '4' || v === 'picked_up' || v === 'delivering')   return 4;
    if (v === '3' || v === 'ready_for_pickup' || v === 'ready') return 3;
    if (v === '2' || v === 'preparing')  return 2;
    if (v === '1' || v === 'accepted')   return 1;
    return 0;
}

function Journey({ step, locale, theme }) {
    const visible = step === 6 ? STEPS : STEPS.filter(s => s.num !== 6);
    return (
        <View>
            {visible.map((item, i) => {
                const done    = step >= item.num && step !== 6;
                const current = step === item.num;
                const canceled = step === 6 && item.num === 6;
                const active  = done || canceled;
                const isLast  = i === visible.length - 1;

                return (
                    <View key={item.key} style={jS.row}>
                        <View style={jS.leftCol}>
                            <View style={[
                                jS.dot,
                                {
                                    borderColor: active || current ? theme.primary : theme.border,
                                    backgroundColor: current ? `${theme.primary}18` : 'transparent',
                                }
                            ]}>
                                <Ionicons
                                    name={item.icon}
                                    size={12}
                                    color={active || current ? theme.primary : theme.textSecondary}
                                />
                            </View>
                            {!isLast && (
                                <View style={[jS.line, { backgroundColor: done && step !== 6 ? theme.primary : theme.border }]} />
                            )}
                        </View>
                        <View style={[jS.label, !isLast && { marginBottom: 18 }]}>
                            <Text style={[
                                jS.labelText,
                                { color: current ? theme.primary : (active ? theme.text : theme.textSecondary) },
                                current && { fontWeight: '700' },
                            ]}>
                                {locale === 'en' ? item.en : item.uk}
                            </Text>
                            {current && (
                                <Text style={[jS.labelSub, { color: theme.primary }]}>
                                    {locale === 'en' ? 'Current status' : 'Поточний статус'}
                                </Text>
                            )}
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

const jS = StyleSheet.create({
    row:       { flexDirection: 'row', alignItems: 'flex-start' },
    leftCol:   { alignItems: 'center', width: 30, marginRight: 12 },
    dot:       { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
    line:      { width: 1.5, flex: 1, minHeight: 18, marginVertical: 3 },
    label:     { paddingTop: 4, flex: 1 },
    labelText: { fontSize: 14, fontWeight: '500' },
    labelSub:  { fontSize: 11, fontWeight: '600', marginTop: 2, opacity: 0.8 },
});

function InfoRow({ icon, iconColor, label, value, theme, action }) {
    return (
        <View style={ir.row}>
            <View style={[ir.iconWrap, { backgroundColor: `${iconColor}15` }]}>
                <Ionicons name={icon} size={15} color={iconColor} />
            </View>
            <View style={ir.body}>
                <Text style={[ir.label, { color: theme.textSecondary }]}>{label}</Text>
                <Text style={[ir.value, { color: theme.text }]} numberOfLines={2}>{value}</Text>
            </View>
            {action && (
                <TouchableOpacity
                    style={[ir.actionBtn, { backgroundColor: iconColor }]}
                    onPress={action.fn}
                    activeOpacity={0.85}
                >
                    <Ionicons name={action.icon} size={13} color="#fff" />
                    <Text style={ir.actionText}>{action.label}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
}

const ir = StyleSheet.create({
    row:       { flexDirection: 'row', alignItems: 'center', gap: 12 },
    iconWrap:  { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    body:      { flex: 1 },
    label:     { fontSize: 11, fontWeight: '600', marginBottom: 2 },
    value:     { fontSize: 14, fontWeight: '600' },
    actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 12, paddingHorizontal: 11, paddingVertical: 7 },
    actionText:{ color: '#fff', fontSize: 12, fontWeight: '700' },
});

function SectionLabel({ title, theme }) {
    return (
        <Text style={[sl.text, { color: theme.textSecondary }]}>{title}</Text>
    );
}
const sl = StyleSheet.create({
    text: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
});

function Card({ children, theme, style }) {
    return (
        <View style={[c.card, { backgroundColor: theme.card, borderColor: theme.border }, style]}>
            {children}
        </View>
    );
}
const c = StyleSheet.create({
    card: { 
        borderRadius: 24, padding: 18, borderWidth: StyleSheet.hairlineWidth, gap: 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 2 }
        })
    },
});

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_HEIGHT = SCREEN_HEIGHT * 0.88;

export default function CourierOrderSheet({ visible, onClose, order }) {
    const colorScheme = useColorScheme();
    const theme       = Colors[colorScheme ?? 'light'];
    const isDark      = colorScheme === 'dark';
    const insets      = useSafeAreaInsets();
    const dispatch    = useDispatch();
    const locale      = useSelector((s) => s.language?.locale ?? 'uk');
    const user        = useSelector((s) => s.auth.user);

    const allActive    = useSelector((s) => s.courier.activeOrders    || []);
    const allAvailable = useSelector((s) => s.courier.availableOrders || []);
    const allCompleted = useSelector((s) => s.courier.completedOrders || []);
    const liveOrder    = [...allActive, ...allAvailable, ...allCompleted].find(o => o.id === order?.id) || order;

    const [photo,      setPhoto]      = useState(null);
    const [submitting, setSubmitting] = useState(false);
    const [routeCoords, setRouteCoords] = useState([]);
    const mapRef = useRef(null);

    const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const activeScale = useRef(new Animated.Value(1)).current;
    const scrollOffset = useRef(0);

    const handleDismiss = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => {
                const { locationY } = evt.nativeEvent;
                const isTouchInHeader = locationY < 80;
                return isTouchInHeader;
            },
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
                if (!isVertical) return false;

                const { locationY } = evt.nativeEvent;
                const isTouchInHeader = locationY < 80;
                const isPullingDown = gestureState.dy > 2;
                const isAtTop = scrollOffset.current <= 0;

                return isTouchInHeader || (isPullingDown && isAtTop);
            },
            onPanResponderGrant: () => {
                translateY.stopAnimation();
                Animated.spring(activeScale, { toValue: 1.3, friction: 8, useNativeDriver: true }).start();
            },
            onPanResponderMove: (_, gestureState) => {
                const dy = gestureState.dy;
                if (dy > 0) {
                    translateY.setValue(dy);
                } else {
                    translateY.setValue(dy * 0.2);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                if (gestureState.vy > 0.5 || gestureState.dy > SHEET_HEIGHT * 0.3) {
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

    useEffect(() => {
        if (visible && liveOrder?.restaurantLatitude && liveOrder?.customerLatitude && mapRef.current) {
            const region = {
                latitude:  ((liveOrder.restaurantLatitude  || 50.45) + (liveOrder.customerLatitude  || 50.45)) / 2,
                longitude: ((liveOrder.restaurantLongitude || 30.52) + (liveOrder.customerLongitude || 30.52)) / 2,
                latitudeDelta:  Math.max(Math.abs((liveOrder.restaurantLatitude  || 50.45) - (liveOrder.customerLatitude  || 50.45)) * 2, 0.015),
                longitudeDelta: Math.max(Math.abs((liveOrder.restaurantLongitude || 30.52) - (liveOrder.customerLongitude || 30.52)) * 2, 0.015),
            };
            // Small delay to allow the Modal to animate open and the map to mount
            const timer = setTimeout(() => {
                mapRef.current?.animateToRegion(region, 800);
            }, 350);
            return () => clearTimeout(timer);
        }
    }, [
        visible,
        liveOrder?.restaurantLatitude,
        liveOrder?.customerLatitude,
        liveOrder?.restaurantLongitude,
        liveOrder?.customerLongitude
    ]);

    // Fetch precise route using OSRM
    useEffect(() => {
        if (!visible) return;
        let active = true;
        const fetchRoute = async () => {
            const startLat = liveOrder?.restaurantLatitude;
            const startLng = liveOrder?.restaurantLongitude;
            const endLat = liveOrder?.customerLatitude;
            const endLng = liveOrder?.customerLongitude;

            if (!startLat || !startLng || !endLat || !endLng) return;

            try {
                const url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${endLng},${endLat}?overview=full&geometries=geojson`;
                const res = await fetch(url);
                const data = await res.json();
                if (active && data.routes && data.routes.length > 0) {
                    const coords = data.routes[0].geometry.coordinates.map(c => ({
                        latitude: c[1],
                        longitude: c[0]
                    }));
                    setRouteCoords(coords);
                }
            } catch (err) {
                console.warn('[CourierOrderSheet] Failed to fetch precise route:', err);
            }
        };

        fetchRoute();
        return () => {
            active = false;
        };
    }, [
        visible,
        liveOrder?.restaurantLatitude,
        liveOrder?.restaurantLongitude,
        liveOrder?.customerLatitude,
        liveOrder?.customerLongitude
    ]);

    useEffect(() => {
        if (visible) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
    }, [visible]);

    if (!liveOrder) return null;

    const step   = statusToStep(liveOrder.status);
    const uid    = user?.userId || user?.id;
    const isMine = Number(liveOrder.courierId) === Number(uid);

    const openMaps = (q) => {
        const url = Platform.select({
            ios:     `maps:0,0?q=${encodeURIComponent(q)}`,
            android: `geo:0,0?q=${encodeURIComponent(q)}`,
        });
        Linking.openURL(url).catch(() => Alert.alert('Error', 'Could not open maps.'));
    };

    const openRouteInMaps = (order) => {
        const restaurantLat = order.restaurantLatitude;
        const restaurantLng = order.restaurantLongitude;
        const customerLat = order.customerLatitude;
        const customerLng = order.customerLongitude;

        if (!restaurantLat || !restaurantLng || !customerLat || !customerLng) {
            Alert.alert('Error', 'Coordinates not available.');
            return;
        }

        const url = Platform.select({
            ios: `http://maps.apple.com/?saddr=Current+Location&daddr=${restaurantLat},${restaurantLng}&daddr=${customerLat},${customerLng}`,
            android: `https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}&waypoints=${restaurantLat},${restaurantLng}&travelmode=driving`
        });

        Linking.openURL(url).catch(() => {
            Linking.openURL(`https://www.google.com/maps/dir/?api=1&destination=${customerLat},${customerLng}&waypoints=${restaurantLat},${restaurantLng}&travelmode=driving`)
                .catch(() => Alert.alert('Error', 'Could not open maps.'));
        });
    };

    const doAccept = async () => {
        setSubmitting(true);
        const res = await dispatch(courierAcceptOrderThunk(liveOrder.id));
        setSubmitting(false);
        if (courierAcceptOrderThunk.fulfilled.match(res)) {
            onClose();
            Alert.alert(
                locale === 'en' ? 'Accepted!' : 'Прийнято!',
                locale === 'en' ? 'Order is now assigned to you.' : 'Замовлення закріплено за вами.'
            );
        } else {
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', String(res.payload || ''));
        }
        dispatch(fetchCourierOrders());
    };

    const doPickup = async () => {
        setSubmitting(true);
        const res = await dispatch(courierPickupOrderThunk(liveOrder.id));
        setSubmitting(false);
        if (courierPickupOrderThunk.fulfilled.match(res) || String(res.payload || '').includes('ALREADY')) {
            Alert.alert(locale === 'en' ? 'Picked up!' : 'Забрано!', locale === 'en' ? 'Head to client.' : 'Прямуйте до клієнта.');
            dispatch(fetchCourierOrders());
        } else {
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', String(res.payload || ''));
        }
    };

    const doConfirm = async () => {
        setSubmitting(true);
        const res = await dispatch(courierConfirmOrderThunk(liveOrder.id));
        setSubmitting(false);
        if (courierConfirmOrderThunk.fulfilled.match(res)) {
            Alert.alert(locale === 'en' ? 'Delivered!' : 'Доставлено!', locale === 'en' ? 'Order completed.' : 'Замовлення виконано.');
            onClose();
        } else {
            const rawError = String(res.payload || '');
            let errorMsg = rawError;
            if (rawError === 'CANNOT_COMPLATE_HOLD' || rawError.toLowerCase().includes('complate hold')) {
                errorMsg = locale === 'en'
                    ? 'Cannot complete delivery due to payment hold. Please contact support/admins.'
                    : 'Не вдалося завершити доставку через утримання оплати. Будь ласка, зв\'яжіться з адміністратором.';
            }
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', errorMsg);
        }
        dispatch(fetchCourierOrders());
    };

    const pickPhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access required.'); return; }
        const r = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
        if (!r.canceled) setPhoto(r.assets[0].uri);
    };

    const renderActions = () => {
        if (step >= 1 && liveOrder.isBooked && !isMine) {
            return (
                <View style={[s.statusChip, { backgroundColor: '#E74C3C15', borderColor: '#E74C3C30' }]}>
                    <Ionicons name="lock-closed" size={15} color="#E74C3C" />
                    <Text style={[s.statusChipText, { color: '#E74C3C' }]}>
                        {locale === 'en' ? 'Taken by another courier' : 'Взято іншим кур\'єром'}
                    </Text>
                </View>
            );
        }

        switch (step) {
            case 0: case 1: case 2:
                if (!liveOrder.isBooked) {
                    return (
                        <SwipeButton
                            title={locale === 'en' ? 'Swipe to accept' : 'Свайп: прийняти замовлення'}
                            onSwipeSuccess={doAccept}
                            isLoading={submitting}
                            isDark={isDark}
                            color={theme.primary}
                            icon="chevron-forward"
                        />
                    );
                }
                return (
                    <View style={[s.statusChip, { backgroundColor: '#F39C1215', borderColor: '#F39C1230' }]}>
                        <Ionicons name="time-outline" size={15} color="#F39C12" />
                        <Text style={[s.statusChipText, { color: '#F39C12' }]}>
                            {locale === 'en' ? 'Waiting for restaurant' : 'Очікування ресторану'}
                        </Text>
                    </View>
                );

            case 3:
                if (!liveOrder.isBooked) {
                    return (
                        <SwipeButton
                            title={locale === 'en' ? 'Accept & Pick Up' : 'Прийняти та забрати'}
                            onSwipeSuccess={doAccept}
                            isLoading={submitting}
                            isDark={isDark}
                            color={theme.primary}
                            icon="chevron-forward"
                        />
                    );
                }
                if (isMine) {
                    return (
                        <SwipeButton
                            title={locale === 'en' ? 'Swipe to pick up' : 'Свайп: забрати замовлення'}
                            onSwipeSuccess={doPickup}
                            isLoading={submitting}
                            isDark={isDark}
                            color="#3498DB"
                            icon="cube-outline"
                        />
                    );
                }
                return null;

            case 4:
                if (!isMine) return null;
                return (
                    <View>
                        <TouchableOpacity
                            onPress={pickPhoto}
                            activeOpacity={0.8}
                            style={[s.photoBtn, { borderColor: theme.border, backgroundColor: theme.input }]}
                        >
                            {photo ? (
                                <Image source={{ uri: photo }} style={s.photoImg} />
                            ) : (
                                <View style={s.photoInner}>
                                    <Ionicons name="camera-outline" size={28} color={theme.textSecondary} />
                                    <Text style={[s.photoHint, { color: theme.textSecondary }]}>
                                        {locale === 'en' ? 'Take delivery photo (optional)' : 'Фото доставки (необов\'язково)'}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                        <SwipeButton
                            title={locale === 'en' ? 'Swipe to confirm delivery' : 'Свайп: підтвердити доставку'}
                            onSwipeSuccess={doConfirm}
                            isLoading={submitting}
                            isDark={isDark}
                            color="#2ECC71"
                            icon="home-outline"
                        />
                    </View>
                );

            case 5:
                return (
                    <View style={[s.statusChip, { backgroundColor: '#2ECC7115', borderColor: '#2ECC7130' }]}>
                        <Ionicons name="checkmark-done-circle" size={15} color="#2ECC71" />
                        <Text style={[s.statusChipText, { color: '#2ECC71' }]}>
                            {locale === 'en' ? 'Delivery completed!' : 'Доставку завершено!'}
                        </Text>
                    </View>
                );

            default: return null;
        }
    };

    return (
        <Modal animationType="none" transparent visible={visible} onRequestClose={handleDismiss}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
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

                <Animated.View 
                    {...panResponder.panHandlers}
                    style={[
                        s.sheet, 
                        { 
                            backgroundColor: theme.card, 
                            paddingBottom: insets.bottom || 16,
                            height: SHEET_HEIGHT,
                            transform: [{ translateY }]
                        }
                    ]}
                >
                    {/* Хендл-зона */}
                    <View style={s.dragHandleArea}>
                        <Animated.View 
                            style={[
                                s.pill,
                                {
                                    transform: [
                                        { scaleX: activeScale },
                                        { scaleY: activeScale }
                                    ]
                                }
                            ]} 
                        />
                    </View>

                    {/* Header */}
                    <View style={[s.header, { borderBottomColor: theme.separator }]}>
                        <View style={{ flex: 1 }}>
                            <Text style={[s.headerSub, { color: theme.textSecondary }]}>
                                #{formatOrderNumber(liveOrder.id)}
                            </Text>
                            <Text style={[s.headerTitle, { color: theme.text }]} numberOfLines={1}>
                                {liveOrder.restaurantName}
                            </Text>
                        </View>
                        <TouchableOpacity
                            style={[s.closeBtn, { backgroundColor: theme.input }]}
                            onPress={handleDismiss}
                            activeOpacity={0.75}
                        >
                            <Ionicons name="close" size={18} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 180 }}
                        onScroll={(e) => {
                            scrollOffset.current = e.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                    >
                        {/* Stats row */}
                        <View style={s.statsRow}>
                            <View style={[s.statChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Text style={[s.statChipVal, { color: theme.primary }]}>{formatPrice(liveOrder.earnings || 0)} ₴</Text>
                                <Text style={[s.statChipLab, { color: theme.textSecondary }]}>{locale === 'en' ? 'Earnings' : 'Заробіток'}</Text>
                            </View>
                            <View style={[s.statChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                <Text style={[s.statChipVal, { color: theme.text }]}>{formatPrice(liveOrder.totalPrice || 0)} ₴</Text>
                                <Text style={[s.statChipLab, { color: theme.textSecondary }]}>{locale === 'en' ? 'Total' : 'Сума'}</Text>
                            </View>
                            {liveOrder.weight ? (
                                <View style={[s.statChip, { backgroundColor: theme.background, borderColor: theme.border }]}>
                                    <Text style={[s.statChipVal, { color: theme.text }]}>{liveOrder.weight} кг</Text>
                                    <Text style={[s.statChipLab, { color: theme.textSecondary }]}>{locale === 'en' ? 'Weight' : 'Вага'}</Text>
                                </View>
                            ) : null}
                        </View>

                        {liveOrder.restaurantLatitude && liveOrder.customerLatitude && (
                            <TouchableOpacity
                                style={[s.mapWrap, { borderColor: theme.border }]}
                                onPress={() => openRouteInMaps(liveOrder)}
                                activeOpacity={0.9}
                            >
                                <MapView
                                    ref={mapRef}
                                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                                    style={StyleSheet.absoluteFillObject}
                                    initialRegion={{
                                        latitude:  ((liveOrder.restaurantLatitude  || 50.45) + (liveOrder.customerLatitude  || 50.45)) / 2,
                                        longitude: ((liveOrder.restaurantLongitude || 30.52) + (liveOrder.customerLongitude || 30.52)) / 2,
                                        latitudeDelta:  Math.max(Math.abs((liveOrder.restaurantLatitude  || 50.45) - (liveOrder.customerLatitude  || 50.45)) * 2, 0.015),
                                        longitudeDelta: Math.max(Math.abs((liveOrder.restaurantLongitude || 30.52) - (liveOrder.customerLongitude || 30.52)) * 2, 0.015),
                                    }}
                                    scrollEnabled={false} zoomEnabled={false} pitchEnabled={false} rotateEnabled={false}
                                >
                                    <Marker coordinate={{ latitude: liveOrder.restaurantLatitude, longitude: liveOrder.restaurantLongitude }}>
                                        <View style={[s.pin, { backgroundColor: theme.primary }]}>
                                            <Ionicons name="restaurant" size={10} color="white" />
                                        </View>
                                    </Marker>
                                    <Marker coordinate={{ latitude: liveOrder.customerLatitude, longitude: liveOrder.customerLongitude }}>
                                        <View style={[s.pin, { backgroundColor: '#3498DB' }]}>
                                            <Ionicons name="home" size={10} color="white" />
                                        </View>
                                    </Marker>
                                    <Polyline
                                        coordinates={routeCoords.length > 0 ? routeCoords : [
                                            { latitude: liveOrder.restaurantLatitude, longitude: liveOrder.restaurantLongitude },
                                            { latitude: liveOrder.customerLatitude,   longitude: liveOrder.customerLongitude   },
                                        ]}
                                        strokeColor={theme.primary} strokeWidth={2.5}
                                    />
                                </MapView>
                                <View style={s.mapOverlayBtn}>
                                    <Ionicons name="navigate-outline" size={14} color="#fff" />
                                    <Text style={s.mapOverlayBtnText}>
                                        {locale === 'en' ? 'Open Route' : 'Відкрити маршрут'}
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        )}

                        {/* Status Journey */}
                        <SectionLabel title={locale === 'en' ? 'Order status' : 'Статус замовлення'} theme={theme} />
                        <Card theme={theme}>
                            <Journey step={step} locale={locale} theme={theme} />
                        </Card>

                        {/* Restaurant */}
                        <SectionLabel title={locale === 'en' ? 'Pick up from' : 'Забрати з'} theme={theme} />
                        <Card theme={theme}>
                            <InfoRow
                                icon="business"
                                iconColor="#F39C12"
                                label={locale === 'en' ? 'Restaurant' : 'Ресторан'}
                                value={liveOrder.restaurantName}
                                theme={theme}
                                action={isMine && step < 4 ? {
                                    icon: 'navigate',
                                    label: locale === 'en' ? 'Route' : 'Маршрут',
                                    fn: () => openMaps(liveOrder.restaurantName),
                                } : null}
                            />
                        </Card>

                        {/* Customer */}
                        <SectionLabel title={locale === 'en' ? 'Deliver to' : 'Доставити до'} theme={theme} />
                        <Card theme={theme}>
                            <InfoRow
                                icon="person"
                                iconColor="#3498DB"
                                label={locale === 'en' ? 'Client' : 'Клієнт'}
                                value={liveOrder.customerName}
                                theme={theme}
                                action={step >= 4 && liveOrder.customerPhone ? {
                                    icon: 'call',
                                    label: locale === 'en' ? 'Call' : 'Дзвінок',
                                    fn: () => Linking.openURL(`tel:${liveOrder.customerPhone?.replace(/[^+\d]/g, '')}`),
                                } : null}
                            />
                            {step >= 4 && liveOrder.address && (
                                <InfoRow
                                    icon="location"
                                    iconColor={theme.primary}
                                    label={locale === 'en' ? 'Address' : 'Адреса'}
                                    value={liveOrder.address}
                                    theme={theme}
                                    action={liveOrder.address !== 'Address N/A' ? {
                                        icon: 'navigate',
                                        label: locale === 'en' ? 'Route' : 'Маршрут',
                                        fn: () => openMaps(liveOrder.address),
                                    } : null}
                                />
                            )}
                        </Card>

                        {/* Items */}
                        {liveOrder.items?.length > 0 && (
                            <>
                                <SectionLabel title={locale === 'en' ? 'Contents' : 'Склад замовлення'} theme={theme} />
                                <Card theme={theme} style={{ gap: 8 }}>
                                    {liveOrder.items.map((item, i) => (
                                        <View key={i} style={[s.item, i > 0 && [s.itemBorder, { borderTopColor: theme.separator }]]}>
                                            <View style={[s.itemDot, { backgroundColor: theme.primary }]} />
                                            <Text style={[s.itemName, { color: theme.text }]}>{item.name}</Text>
                                            <Text style={[s.itemQty, { color: theme.primary }]}>×{item.quantity}</Text>
                                        </View>
                                    ))}
                                </Card>
                            </>
                        )}
                    </ScrollView>

                    {/* Footer actions */}
                    <View style={[
                        s.footer, 
                        { 
                            backgroundColor: theme.card, 
                            borderTopColor: theme.separator,
                            paddingBottom: (Platform.OS === 'android' ? Math.max(insets.bottom, 48) : (insets.bottom || 16)) + 10
                        }
                    ]}>
                        {(!liveOrder.address || liveOrder.address === 'Address N/A') && step >= 4 && (
                            <View style={[s.warnRow, { backgroundColor: '#F39C1212', borderColor: '#F39C1230' }]}>
                                <Ionicons name="warning-outline" size={14} color="#F39C12" />
                                <Text style={[s.warnText, { color: '#F39C12' }]}>
                                    {locale === 'en' ? 'Customer address not available' : 'Адресу клієнта не знайдено'}
                                </Text>
                            </View>
                        )}
                        {renderActions()}
                    </View>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        height: '88%', overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 10, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 10 }
        })
    },
    pill: {
        width: 48, height: 5, borderRadius: 2.5,
        backgroundColor: '#C6C6CC',
    },
    dragHandleArea: {
        width: '100%',
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginTop: 6,
    },
    header: {
        flexDirection: 'row', alignItems: 'flex-start',
        paddingHorizontal: 20, paddingVertical: 14,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    headerSub:   { fontSize: 11, fontWeight: '600', letterSpacing: 1, marginBottom: 3, textTransform: 'uppercase' },
    headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: -0.4 },
    closeBtn:    { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginLeft: 14 },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginTop: 16, marginBottom: 4 },
    statChip: { 
        flex: 1, borderRadius: 20, padding: 12, alignItems: 'center', borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 1 }
        })
    },
    statChipVal: { fontSize: 16, fontWeight: '800', marginBottom: 3, letterSpacing: -0.3 },
    statChipLab: { fontSize: 11, fontWeight: '700' },

    // Map
    mapWrap: { 
        height: 160, borderRadius: 24, overflow: 'hidden', marginTop: 16, borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 2 }
        })
    },
    pin: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: '#fff' },
    mapOverlayBtn: {
        position: 'absolute',
        bottom: 12,
        right: 12,
        backgroundColor: 'rgba(0,0,0,0.65)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        gap: 4,
    },
    mapOverlayBtnText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },

    // Status chip
    statusChip: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderRadius: 12, padding: 14, marginBottom: 8,
        borderWidth: 1,
    },
    statusChipText: { fontSize: 14, fontWeight: '600' },

    // Photo
    photoBtn: { 
        height: 110, borderRadius: 20, overflow: 'hidden', marginBottom: 12, justifyContent: 'center', alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    photoInner: { alignItems: 'center', gap: 8 },
    photoHint: { fontSize: 13, fontWeight: '500' },
    photoImg: { width: '100%', height: '100%', resizeMode: 'cover' },

    // Items
    item:       { flexDirection: 'row', alignItems: 'center', paddingVertical: 6 },
    itemBorder: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 12, marginTop: 0 },
    itemDot:    { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
    itemName:   { flex: 1, fontSize: 14, fontWeight: '500' },
    itemQty:    { fontSize: 14, fontWeight: '800' },

    // Footer
    footer: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10,
        borderTopWidth: StyleSheet.hairlineWidth,
    },
    warnRow: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, padding: 10, marginBottom: 10, borderWidth: 1 },
    warnText: { fontSize: 12, fontWeight: '600', flex: 1 },
});
