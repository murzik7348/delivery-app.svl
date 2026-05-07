import React, { useState, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, Modal, TouchableOpacity, useColorScheme,
    ScrollView, Image, Alert, Linking, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import {
    courierAcceptOrderThunk, courierPickupOrderThunk, courierConfirmOrderThunk,
    fetchCourierOrders, updateActiveOrderStatus, completeActiveOrder,
} from '../store/courierSlice';
import { t } from '../constants/translations';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import SwipeButton from './SwipeButton';

// ── Status Journey Config (aligned with DB enum 0-6) ──────────────────
const JOURNEY_STEPS = [
    { num: 0, key: 'created',          icon: 'receipt-outline',       color: '#8e44ad', labelUk: 'Оформлено',       labelEn: 'Created' },
    { num: 1, key: 'accepted',         icon: 'checkmark-circle',      color: '#2ecc71', labelUk: 'Прийнято',        labelEn: 'Accepted' },
    { num: 2, key: 'preparing',        icon: 'flame',                 color: '#f39c12', labelUk: 'Готується',       labelEn: 'Cooking' },
    { num: 3, key: 'ready_for_pickup', icon: 'bag-handle',            color: '#e67e22', labelUk: 'Готово до видачі',labelEn: 'Ready' },
    { num: 4, key: 'delivering',       icon: 'bicycle',               color: '#3498db', labelUk: 'В дорозі',        labelEn: 'Delivering' },
    { num: 5, key: 'completed',        icon: 'home',                  color: '#27ae60', labelUk: 'Доставлено',      labelEn: 'Delivered' },
    { num: 6, key: 'canceled',         icon: 'close-circle',          color: '#e74c3c', labelUk: 'Скасовано',       labelEn: 'Canceled' },
];

function statusToStep(status) {
    const s = String(status ?? '').toLowerCase();
    if (s === '6' || s === 'canceled' || s === 'cancelled') return 6;
    if (s === '5' || s === 'delivered' || s === 'completed') return 5;
    if (s === '4' || s === 'picked_up' || s === 'delivering') return 4;
    if (s === '3' || s === 'ready_for_pickup' || s === 'ready') return 3;
    if (s === '2' || s === 'preparing') return 2;
    if (s === '1' || s === 'accepted') return 1;
    return 0;
}

// ── Animated pulsing dot for current step ─────────────────────────────
function PulsingDot({ color }) {
    const anim = useRef(new Animated.Value(1)).current;
    useEffect(() => {
        Animated.loop(Animated.sequence([
            Animated.timing(anim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
            Animated.timing(anim, { toValue: 1,   duration: 700, useNativeDriver: true }),
        ])).start();
    }, []);
    return (
        <Animated.View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color, transform: [{ scale: anim }], shadowColor: color, shadowOpacity: 0.8, shadowRadius: 6 }} />
    );
}

// ── Journey Tracker ────────────────────────────────────────────────────
function StatusJourney({ currentStep, locale, isDark }) {
    const steps = currentStep === 6
        ? JOURNEY_STEPS  // show all including canceled
        : JOURNEY_STEPS.filter(s => s.num !== 6); // hide canceled if not canceled

    return (
        <View style={jStyles.container}>
            {steps.map((step, idx) => {
                const done = currentStep >= step.num && currentStep !== 6;
                const isCurrent = currentStep === step.num;
                const canceled = currentStep === 6 && step.num === 6;
                const active = done || canceled;
                const color = active || isCurrent ? step.color : (isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.12)');
                const isLast = idx === steps.length - 1;

                return (
                    <View key={step.key} style={jStyles.row}>
                        {/* Left column: icon + line */}
                        <View style={jStyles.leftCol}>
                            <View style={[jStyles.iconCircle, { backgroundColor: active || isCurrent ? step.color : (isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)'), borderColor: color, borderWidth: 2 }]}>
                                {isCurrent
                                    ? <PulsingDot color="white" />
                                    : <Ionicons name={step.icon} size={16} color={active ? 'white' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.25)')} />
                                }
                            </View>
                            {!isLast && (
                                <View style={[jStyles.line, { backgroundColor: (currentStep > step.num && currentStep !== 6) || (currentStep === 6 && step.num < 6) ? step.color : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)') }]} />
                            )}
                        </View>
                        {/* Right: label */}
                        <Text style={[jStyles.label, {
                            color: isCurrent ? step.color : (active ? (isDark ? '#fff' : '#222') : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.3)')),
                            fontWeight: isCurrent ? '800' : (active ? '600' : '400'),
                            marginBottom: isLast ? 0 : 24,
                        }]}>
                            {locale === 'en' ? step.labelEn : step.labelUk}
                            {isCurrent && <Text style={{ fontSize: 10 }}>  ●</Text>}
                        </Text>
                    </View>
                );
            })}
        </View>
    );
}

const jStyles = StyleSheet.create({
    container: { paddingVertical: 8, paddingHorizontal: 4 },
    row: { flexDirection: 'row', alignItems: 'flex-start' },
    leftCol: { alignItems: 'center', width: 40, marginRight: 14 },
    iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    line: { width: 2, flex: 1, minHeight: 28, marginVertical: 2, borderRadius: 1 },
    label: { fontSize: 15, paddingTop: 8 },
});

// ── Main Component ─────────────────────────────────────────────────────
export default function CourierOrderSheet({ visible, onClose, order }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const user = useSelector((state) => state.auth.user);

    const activeOrders = useSelector((state) => state.courier.activeOrders || []);
    const availableOrders = useSelector((state) => state.courier.availableOrders || []);
    const completedOrders = useSelector((state) => state.courier.completedOrders || []);
    const liveOrder = [...activeOrders, ...availableOrders, ...completedOrders].find(o => o.id === order?.id) || order;

    const [deliveryPhoto, setDeliveryPhoto] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!liveOrder) return null;

    const currentStep = statusToStep(liveOrder.status);
    const currentUserId = user?.userId || user?.id;
    const isMine = Number(liveOrder.courierId) === Number(currentUserId);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') { Alert.alert('Permission needed', 'Camera access required.'); return; }
        const result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [4, 3], quality: 0.7 });
        if (!result.canceled) setDeliveryPhoto(result.assets[0].uri);
    };

    const handleAcceptOrder = async () => {
        setIsSubmitting(true);
        const resultAction = await dispatch(courierAcceptOrderThunk(liveOrder.id));
        setIsSubmitting(false);
        if (courierAcceptOrderThunk.fulfilled.match(resultAction)) {
            onClose();
            Alert.alert(locale === 'en' ? 'Accepted!' : 'Прийнято!', locale === 'en' ? 'Order assigned to you.' : 'Замовлення закріплене за вами.');
        } else {
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', String(resultAction.payload || ''));
        }
        dispatch(fetchCourierOrders());
    };

    const handleConfirmDelivery = async () => {
        setIsSubmitting(true);
        const resultAction = await dispatch(courierConfirmOrderThunk(liveOrder.id));
        setIsSubmitting(false);
        if (courierConfirmOrderThunk.fulfilled.match(resultAction)) {
            Alert.alert(locale === 'en' ? 'Delivered!' : 'Доставлено!', locale === 'en' ? 'Order completed.' : 'Замовлення завершено.');
            onClose();
        } else {
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', String(resultAction.payload || ''));
        }
        dispatch(fetchCourierOrders());
    };

    const renderWorkflowButtons = () => {
        switch (currentStep) {
            case 0: case 1: case 2:
                if (!liveOrder.isBooked) return (
                    <SwipeButton title={locale === 'en' ? 'Swipe to Accept' : 'Свайпніть щоб прийняти'} onSwipeSuccess={handleAcceptOrder} isLoading={isSubmitting} isDark={isDark} color="#e334e3" icon="chevron-forward" />
                );
                if (!isMine) return (
                    <View style={[s.infoBox, { backgroundColor: '#e74c3c20' }]}>
                        <Ionicons name="lock-closed" size={20} color="#e74c3c" /><Text style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: 10 }}>{locale === 'en' ? 'Booked by other courier' : 'Заброньовано іншим'}</Text>
                    </View>
                );
                return (
                    <View style={[s.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <Ionicons name="time-outline" size={22} color="#e67e22" /><Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 10 }}>{locale === 'en' ? 'Wait for food to be ready' : 'Очікуйте готовність страви'}</Text>
                    </View>
                );
            case 3:
                if (!liveOrder.isBooked) return (
                    <SwipeButton title={locale === 'en' ? 'Swipe to Accept & Pick Up' : 'Свайпніть щоб прийняти і забрати'} onSwipeSuccess={handleAcceptOrder} isLoading={isSubmitting} isDark={isDark} color="#e334e3" icon="chevron-forward" />
                );
                if (!isMine) return (
                    <View style={[s.infoBox, { backgroundColor: '#e74c3c20' }]}>
                        <Ionicons name="lock-closed" size={20} color="#e74c3c" /><Text style={{ color: '#e74c3c', fontWeight: 'bold', marginLeft: 10 }}>{locale === 'en' ? 'Booked' : 'Заброньовано'}</Text>
                    </View>
                );
                return (
                    <SwipeButton
                        title={locale === 'en' ? 'Swipe to Pick Up' : 'Свайпніть щоб забрати'}
                        onSwipeSuccess={async () => {
                            setIsSubmitting(true);
                            const res = await dispatch(courierPickupOrderThunk(liveOrder.id));
                            setIsSubmitting(false);
                            if (courierPickupOrderThunk.fulfilled.match(res) || String(res.payload || '').includes('ALREADY')) {
                                Alert.alert(locale === 'en' ? 'Picked Up!' : 'Забрано!', locale === 'en' ? 'Head to client.' : 'Прямуйте до клієнта.');
                                dispatch(fetchCourierOrders());
                            } else {
                                Alert.alert(locale === 'en' ? 'Error' : 'Помилка', String(res.payload || ''));
                            }
                        }}
                        isLoading={isSubmitting} isDark={isDark} color="#3498db" icon="cube-outline"
                    />
                );
            case 4:
                return (
                    <View style={s.deliveryProofContainer}>
                        <TouchableOpacity onPress={pickImage} style={[s.photoBtn, { borderColor: theme.border }]}>
                            {deliveryPhoto
                                ? <Image source={{ uri: deliveryPhoto }} style={s.deliveryImage} />
                                : (<><Ionicons name="camera" size={32} color="#e334e3" /><Text style={[s.photoBtnText, { color: theme.text }]}>{locale === 'en' ? 'Take photo at door' : 'Зробити фото біля дверей'}</Text></>)
                            }
                        </TouchableOpacity>
                        <SwipeButton title={locale === 'en' ? 'Swipe to Deliver' : 'Свайпніть щоб доставлено'} onSwipeSuccess={handleConfirmDelivery} isLoading={isSubmitting} isDark={isDark} color="#2ecc71" icon="home-outline" />
                    </View>
                );
            case 5:
                return (
                    <View style={[s.infoBox, { backgroundColor: '#2ecc7120' }]}>
                        <Ionicons name="checkmark-done-circle" size={24} color="#2ecc71" /><Text style={{ color: '#2ecc71', fontWeight: 'bold', marginLeft: 10 }}>{locale === 'en' ? 'Delivery Completed ✓' : 'Доставка завершена ✓'}</Text>
                    </View>
                );
            default: return null;
        }
    };

    return (
        <Modal animationType="slide" transparent visible={visible} onRequestClose={onClose}>
            <View style={s.backdrop}>
                <TouchableOpacity activeOpacity={1} onPress={onClose} style={StyleSheet.absoluteFill} />
                <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'}
                    style={[s.sheet, { backgroundColor: isDark ? 'rgba(20,20,20,0.8)' : 'rgba(255,255,255,0.85)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)', borderWidth: 1 }]}>

                    <View style={[s.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.18)' }]} />

                    {/* Header */}
                    <View style={s.header}>
                        <View>
                            <Text style={[s.title, { color: theme.text }]}>{locale === 'en' ? 'Order' : 'Замовлення'} {formatOrderNumber(liveOrder.id)}</Text>
                            <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>{liveOrder.restaurantName}</Text>
                        </View>
                        <TouchableOpacity onPress={onClose}><Ionicons name="close-circle-outline" size={28} color={theme.textSecondary} /></TouchableOpacity>
                    </View>

                    <ScrollView showsVerticalScrollIndicator={false} style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 240 }}>

                        {/* Stats row */}
                        <View style={s.statsRow}>
                            <View style={[s.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="wallet-outline" size={22} color="#2ecc71" />
                                <Text style={[s.statValue, { color: theme.text }]}>{liveOrder.earnings || 0} ₴</Text>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]}>{locale === 'en' ? 'Earnings' : 'Заробіток'}</Text>
                            </View>
                            <View style={[s.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="cash-outline" size={22} color="#e334e3" />
                                <Text style={[s.statValue, { color: theme.text }]}>{liveOrder.totalPrice || 0} ₴</Text>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]}>{locale === 'en' ? 'Total' : 'Сума'}</Text>
                            </View>
                            <View style={[s.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="barbell-outline" size={22} color="#e67e22" />
                                <Text style={[s.statValue, { color: theme.text }]}>{liveOrder.weight ? `${liveOrder.weight}kg` : '—'}</Text>
                                <Text style={[s.statLabel, { color: theme.textSecondary }]}>{locale === 'en' ? 'Weight' : 'Вага'}</Text>
                            </View>
                        </View>

                        {/* Distance to client card (only when delivering) */}
                        {currentStep === 4 && (liveOrder.navigationStats?.toClientDistance || liveOrder.navigationStats?.toClientTime) && (
                            <View style={[s.distanceCard, { backgroundColor: '#3498db15', borderColor: '#3498db30' }]}>
                                <View style={s.distanceIconWrap}>
                                    <Ionicons name="navigate" size={28} color="#3498db" />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={{ color: '#3498db', fontWeight: '800', fontSize: 16 }}>
                                        {locale === 'en' ? 'Distance to client' : 'До клієнта'}
                                    </Text>
                                    <Text style={{ color: '#3498db', fontSize: 22, fontWeight: '900', marginTop: 2 }}>
                                        {liveOrder.navigationStats?.toClientDistance || liveOrder.navigationStats?.toClientTime || '—'}
                                    </Text>
                                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{liveOrder.address}</Text>
                                </View>
                            </View>
                        )}

                        {/* Status Journey */}
                        <Text style={[s.sectionTitle, { color: theme.text }]}>{locale === 'en' ? 'Order Journey' : 'Шлях замовлення'}</Text>
                        <View style={[s.journeyCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)', borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }]}>
                            <StatusJourney currentStep={currentStep} locale={locale} isDark={isDark} />
                        </View>

                        {/* Customer info */}
                        <Text style={[s.sectionTitle, { color: theme.text }]}>{locale === 'en' ? 'Customer' : 'Клієнт'}</Text>
                        <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={s.infoRow}>
                                <Ionicons name="person-outline" size={18} color="#3498db" style={{ marginRight: 12 }} />
                                <Text style={[{ color: theme.text, fontWeight: '600', flex: 1 }]}>{liveOrder.customerName}</Text>
                                {currentStep >= 4 && liveOrder.customerPhone && (
                                    <TouchableOpacity style={s.callBtn} onPress={() => Linking.openURL(`tel:${liveOrder.customerPhone?.replace(/[^+\d]/g, '')}`)}>
                                        <Ionicons name="call" size={14} color="white" />
                                        <Text style={s.callBtnText}>{locale === 'en' ? 'Call' : 'Дзвінок'}</Text>
                                    </TouchableOpacity>
                                )}
                            </View>
                            {currentStep >= 4 && (
                                <View style={s.infoRow}>
                                    <Ionicons name="location-outline" size={18} color="#e334e3" style={{ marginRight: 12 }} />
                                    <Text style={[{ color: theme.textSecondary, flex: 1, fontSize: 14 }]} numberOfLines={2}>{liveOrder.address}</Text>
                                </View>
                            )}
                        </View>

                        {/* Items */}
                        {liveOrder.items?.length > 0 && (
                            <>
                                <Text style={[s.sectionTitle, { color: theme.text }]}>{locale === 'en' ? 'Items' : 'Склад'}</Text>
                                <View style={[s.infoCard, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                    {liveOrder.items.map((item, i) => (
                                        <View key={i} style={[s.itemRow, i > 0 && { borderTopWidth: 1, borderTopColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.05)', paddingTop: 10 }]}>
                                            <Text style={[{ color: theme.text, flex: 1, fontWeight: '500' }]}>{item.name}</Text>
                                            <Text style={{ color: '#e334e3', fontWeight: '800' }}>×{item.quantity}</Text>
                                        </View>
                                    ))}
                                </View>
                            </>
                        )}
                    </ScrollView>

                    {/* Sticky footer */}
                    <View style={[s.fixedFooter, { borderTopColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)', paddingBottom: Math.max(insets.bottom, 20) }]}>
                        {(!liveOrder.address || liveOrder.address === 'Address N/A') && (
                            <View style={s.warningBox}>
                                <Ionicons name="warning-outline" size={14} color="#e67e22" />
                                <Text style={s.warningText}>{locale === 'en' ? 'Address missing' : 'Адреса відсутня'}</Text>
                            </View>
                        )}
                        {renderWorkflowButtons()}
                    </View>
                </BlurView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.55)' },
    sheet: { borderTopLeftRadius: 32, borderTopRightRadius: 32, paddingHorizontal: 20, paddingTop: 12, height: '85%' },
    pill: { width: 44, height: 5, borderRadius: 3, alignSelf: 'center', marginBottom: 16 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 },
    title: { fontSize: 22, fontWeight: '900' },
    statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
    statBox: { flex: 1, borderRadius: 16, padding: 14, alignItems: 'center' },
    statValue: { fontSize: 16, fontWeight: '800', marginTop: 6 },
    statLabel: { fontSize: 11, marginTop: 2, textAlign: 'center' },
    sectionTitle: { fontSize: 16, fontWeight: '800', marginBottom: 10, marginTop: 18 },
    journeyCard: { borderRadius: 20, padding: 16, borderWidth: 1, marginBottom: 4 },
    infoCard: { borderRadius: 16, padding: 16, gap: 12 },
    infoRow: { flexDirection: 'row', alignItems: 'center' },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 },
    distanceCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 20, borderWidth: 1, padding: 16, marginBottom: 4, gap: 14 },
    distanceIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#3498db20', alignItems: 'center', justifyContent: 'center' },
    callBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#27ae60', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
    callBtnText: { color: 'white', fontSize: 12, fontWeight: '800', marginLeft: 4 },
    fixedFooter: { position: 'absolute', bottom: 0, left: 0, right: 0, paddingHorizontal: 20, paddingTop: 14, borderTopWidth: 1 },
    primaryBtn: { backgroundColor: '#e334e3', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginVertical: 8 },
    btnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    infoBox: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, justifyContent: 'center', marginVertical: 8 },
    deliveryProofContainer: { marginTop: 8 },
    photoBtn: { borderWidth: 2, borderStyle: 'dashed', borderRadius: 16, height: 140, justifyContent: 'center', alignItems: 'center', marginBottom: 14, overflow: 'hidden' },
    photoBtnText: { marginTop: 10, fontSize: 15, fontWeight: '500' },
    deliveryImage: { width: '100%', height: '100%' },
    warningBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fdf2e9', padding: 8, borderRadius: 8, marginBottom: 10 },
    warningText: { fontSize: 12, color: '#e67e22', marginLeft: 6, fontWeight: 'bold' },
});
