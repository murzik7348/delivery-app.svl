import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, ActivityIndicator,
    ScrollView, RefreshControl, Platform, Animated, Alert, Linking
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import Colors from '../constants/Colors';
import CourierOrderSheet from './CourierOrderSheet';
import { fetchCourierOrders, updateOnlineStatusThunk, fetchShiftStatusThunk } from '../store/courierSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { courierUpdateLocation } from '../src/api';
import { formatPrice } from '../store/cartSlice';

function StatusBadge({ status, locale, theme }) {
  let color = '#8e44ad';
  let text = locale === 'en' ? 'New' : 'Новий';
  let icon = 'receipt';

  const s = String(status ?? 'created').toLowerCase();
  
  if (s === '6' || s === 'canceled' || s === 'cancelled') {
    color = '#e74c3c';
    text = locale === 'en' ? 'Canceled' : 'Скасовано';
    icon = 'close-circle';
  } else if (s === '5' || s === 'delivered' || s === 'completed') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Delivered' : 'Доставлено';
    icon = 'home';
  } else if (s === '4' || s === 'delivering' || s === 'picked_up') {
    color = '#3498db';
    text = locale === 'en' ? 'Delivering' : 'Хутко мчить';
    icon = 'bicycle';
  } else if (s === '3' || s === 'ready_for_pickup' || s === 'ready') {
    color = '#f39c12';
    text = locale === 'en' ? 'Ready' : 'Готово до забору';
    icon = 'cube';
  } else if (s === '2' || s === 'preparing') {
    color = '#f39c12';
    text = locale === 'en' ? 'Cooking' : 'Готується';
    icon = 'flame';
  } else if (s === '1' || s === 'accepted') {
    color = '#2ecc71';
    text = locale === 'en' ? 'Confirmed' : 'Підтверджено';
    icon = 'checkmark-circle';
  }

  return (
    <View style={[styles.statusBadge, { backgroundColor: color + '20', borderColor: color + '30' }]}>
      <Ionicons name={icon} size={14} color={color} style={{ marginRight: 4 }} />
      <Text style={{ color, fontWeight: '800', fontSize: 13, textTransform: 'uppercase' }}>{text}</Text>
    </View>
  );
}

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

export default function CourierOrdersPanel() {
    const colorScheme = useColorScheme();
    const theme       = Colors[colorScheme ?? 'light'];
    const isDark      = colorScheme === 'dark';
    const locale      = useSelector((s) => s.language?.locale ?? 'uk');
    const dispatch    = useDispatch();
    const router      = useRouter();

    const {
        availableOrders = [], activeOrders = [], completedOrders = [],
        isLoading = false, isOnline = false,
    } = useSelector((s) => s.courier || {});
    const user   = useSelector((s) => s.auth.user);
    const userId = user?.userId || user?.id;

    const [selectedOrder, setSelectedOrder] = useState(null);
    const [sheetVisible,  setSheetVisible]  = useState(false);
    const [refreshing,    setRefreshing]    = useState(false);
    const [lastSync,      setLastSync]      = useState(new Date().toLocaleTimeString());
    const [activeTab,     setActiveTab]     = useState('available');

    const autoSwitched  = useRef(false);
    const locationSub   = useRef(null);
    const pulseAnim     = useRef(new Animated.Value(1)).current;

    // Pulsing green dot when online
    useEffect(() => {
        if (isOnline) {
            const loop = Animated.loop(Animated.sequence([
                Animated.timing(pulseAnim, { toValue: 1.8, duration: 900, useNativeDriver: true }),
                Animated.timing(pulseAnim, { toValue: 1,   duration: 900, useNativeDriver: true }),
            ]));
            loop.start();
            return () => loop.stop();
        }
        pulseAnim.setValue(1);
    }, [isOnline]);

    // Auto-switch tab when active orders arrive
    useEffect(() => {
        if (activeOrders.length > 0 && activeTab === 'available' && !isLoading && !autoSwitched.current) {
            setActiveTab('active');
            autoSwitched.current = true;
        }
    }, [activeOrders.length, isLoading]);

    const toggleOnline = async () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => null);
        try {
            await dispatch(updateOnlineStatusThunk(!isOnline)).unwrap();
        } catch (error) {
            if (error === 'ACTIVE_DELIVERY_EXISTS') {
                Alert.alert(
                    locale === 'en' ? 'Warning' : 'Попередження',
                    locale === 'en'
                        ? 'Finish delivery first. You have active uncompleted orders.'
                        : 'У вас є активні невиконані замовлення.',
                    [{ text: 'OK' }]
                );
            } else {
                Alert.alert(
                    locale === 'en' ? 'Error' : 'Помилка',
                    locale === 'en' ? 'Failed to change shift status.' : 'Не вдалося змінити статус зміни.',
                    [{ text: 'OK' }]
                );
            }
        }
    };

    const openDetails = (order) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
        setSelectedOrder(order);
        setSheetVisible(true);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await Promise.all([
            dispatch(fetchCourierOrders()),
            dispatch(fetchShiftStatusThunk())
        ]);
        setLastSync(new Date().toLocaleTimeString());
        setRefreshing(false);
    }, [dispatch]);

    // Poll every 15 s
    useEffect(() => {
        dispatch(fetchCourierOrders());
        dispatch(fetchShiftStatusThunk());
        const iv = setInterval(() => {
            dispatch(fetchCourierOrders());
            setLastSync(new Date().toLocaleTimeString());
        }, 15000);
        return () => clearInterval(iv);
    }, [dispatch]);

    // GPS tracking is managed globally in RootLayout (via useCourierLocation hook)

    const todayEarnings = completedOrders.reduce((sum, o) => sum + (Number(o.earnings) || 0), 0);

    const TABS = [
        { id: 'active',    label: locale === 'en' ? 'Active'    : 'Активні',  icon: 'flash',        count: activeOrders.length    },
        { id: 'available', label: locale === 'en' ? 'Available' : 'Доступні', icon: 'grid-outline', count: availableOrders.length },
        { id: 'history',   label: locale === 'en' ? 'History'   : 'Історія',  icon: 'time-outline', count: completedOrders.length },
    ];

    const renderCard = (item, type) => {
        const isMine = Number(item.courierId) === Number(userId);
        const isHistory = type === 'history';
        const sNum = item.deliveryStatus ?? Number(item.statusDelivery ?? item.status ?? 0);
        const activeStatus = String(item.statusDelivery ?? item.status ?? 'created').toLowerCase();

        let color = '#8e44ad';
        let iconName = 'receipt';
        if (sNum === 6 || activeStatus === 'canceled' || activeStatus === 'cancelled') {
            color = '#e74c3c';
            iconName = 'close-circle';
        } else if (sNum === 5 || activeStatus === 'delivered' || activeStatus === 'completed') {
            color = '#2ecc71';
            iconName = 'home';
        } else if (sNum === 4 || activeStatus === 'delivering' || activeStatus === 'picked_up') {
            color = '#3498db';
            iconName = 'bicycle';
        } else if (sNum === 3 || activeStatus === 'ready_for_pickup' || activeStatus === 'ready') {
            color = '#f39c12';
            iconName = 'cube';
        } else if (sNum === 2 || activeStatus === 'preparing') {
            color = '#f39c12';
            iconName = 'flame';
        } else if (sNum === 1 || activeStatus === 'accepted') {
            color = '#2ecc71';
            iconName = 'checkmark-circle';
        }

        return (
            <TouchableOpacity
                key={item.id}
                style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    !isMine && !isHistory && type !== 'available' && styles.cardDimmed,
                ]}
                activeOpacity={0.8}
                onPress={() => openDetails(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: color + '15' }]}>
                            <Ionicons name={iconName} size={20} color={color} />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.restaurantName}
                            </Text>
                            <Text style={styles.date}>
                                #{formatOrderNumber(item.id)}
                            </Text>
                        </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                        <Text style={[styles.price, { color: theme.text }]}>
                            {formatPrice(item.earnings || 0)} ₴
                        </Text>
                        <Text style={{ fontSize: 11, color: 'gray', fontWeight: '600', marginTop: 2 }}>
                            {locale === 'en' ? 'Earnings' : 'Заробіток'}
                        </Text>
                    </View>
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />

                {/* Route Info */}
                <View style={styles.routeContainer}>
                    <View style={styles.routeRow}>
                        <Ionicons name="location-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                        <Text style={[styles.routeText, { color: theme.textSecondary }]} numberOfLines={1}>
                            {(type === 'active' || isMine || isHistory)
                                ? (item.address || (locale === 'en' ? 'No address' : 'Адреса відсутня'))
                                : (locale === 'en' ? 'Address hidden' : 'Адреса прихована')}
                        </Text>
                    </View>
                    {item.totalPrice && (
                        <View style={[styles.routeRow, { marginTop: 6 }]}>
                            <Ionicons name="wallet-outline" size={14} color={theme.textSecondary} style={{ marginRight: 6 }} />
                            <Text style={[styles.routeText, { color: theme.textSecondary }]}>
                                {locale === 'en' ? 'Order total' : 'Сума замовлення'}: {formatPrice(item.totalPrice)} ₴
                            </Text>
                        </View>
                    )}
                </View>

                <View style={[styles.divider, { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)' }]} />

                <View style={styles.cardFooter}>
                    <StatusBadge status={item.status} locale={locale} theme={theme} />
                    
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        {type === 'active' && (
                            <TouchableOpacity
                                style={[styles.mapActionBtn, { backgroundColor: `${theme.primary}12` }]}
                                onPress={(e) => {
                                    e.stopPropagation();
                                    openRouteInMaps(item);
                                }}
                                activeOpacity={0.7}
                            >
                                <Ionicons name="map-outline" size={15} color={theme.primary} style={{ marginRight: 4 }} />
                                <Text style={[styles.mapActionText, { color: theme.primary }]}>
                                    {locale === 'en' ? 'Map' : 'Карта'}
                                </Text>
                            </TouchableOpacity>
                        )}
                        <View style={styles.detailsBtn}>
                            <Text style={[styles.detailsText, { color: theme.primary }]}>
                                {locale === 'en' ? 'Details' : 'Деталі'}
                            </Text>
                            <Ionicons name="chevron-forward" size={16} color={theme.primary} />
                        </View>
                    </View>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmpty = (icon, title, sub, action) => (
        <View style={styles.emptyWrap}>
            <View style={[styles.emptyIconWrap, { backgroundColor: `${theme.primary}12` }]}>
                <Ionicons name={icon} size={36} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
            <Text style={[styles.emptySub,   { color: theme.textSecondary }]}>{sub}</Text>
            {action ? (
                <TouchableOpacity
                    style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
                    onPress={action.fn}
                    activeOpacity={0.85}
                >
                    <Ionicons name={action.icon} size={15} color="#fff" style={{ marginRight: 7 }} />
                    <Text style={styles.emptyBtnText}>{action.label}</Text>
                </TouchableOpacity>
            ) : (
                <TouchableOpacity
                    style={[styles.emptyBtnOutline, { borderColor: theme.primary }]}
                    onPress={onRefresh}
                    activeOpacity={0.85}
                >
                    <Ionicons name="refresh" size={15} color={theme.primary} style={{ marginRight: 7 }} />
                    <Text style={[styles.emptyBtnText, { color: theme.primary }]}>
                        {locale === 'en' ? 'Refresh' : 'Оновити'}
                    </Text>
                </TouchableOpacity>
            )}
        </View>
    );

    return (
        <View style={styles.root}>
            {/* Online status row */}
            <TouchableOpacity
                style={[styles.onlineCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                onPress={toggleOnline}
                activeOpacity={0.85}
            >
                <View style={styles.onlineLeft}>
                    <View style={styles.dotWrap}>
                        {isOnline && (
                            <Animated.View style={[
                                styles.dotRing,
                                { backgroundColor: '#2ECC7130', transform: [{ scale: pulseAnim }] }
                            ]} />
                        )}
                        <View style={[styles.dot, { backgroundColor: isOnline ? '#2ECC71' : theme.tabIconDefault }]} />
                    </View>

                    <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.onlineLabel, { color: isOnline ? '#2ECC71' : theme.textSecondary }]}>
                            {isOnline
                                ? (locale === 'en' ? 'Online' : 'Онлайн')
                                : (locale === 'en' ? 'Offline' : 'Офлайн')}
                        </Text>
                        <Text style={[styles.onlineSync, { color: theme.textSecondary }]}>
                            {locale === 'en' ? `Updated ${lastSync}` : `Оновлено: ${lastSync}`}
                        </Text>
                    </View>
                </View>

                <View style={[
                    styles.onlineToggle,
                    { backgroundColor: isOnline ? '#2ECC7120' : theme.input }
                ]}>
                    <Ionicons
                        name={isOnline ? 'power' : 'power-outline'}
                        size={17}
                        color={isOnline ? '#2ECC71' : theme.textSecondary}
                    />
                    <Text style={[
                        styles.onlineToggleText,
                        { color: isOnline ? '#2ECC71' : theme.textSecondary }
                    ]}>
                        {isOnline
                            ? (locale === 'en' ? 'Go Offline' : 'Вимкнути')
                            : (locale === 'en' ? 'Go Online'  : 'Вийти на зміну')}
                    </Text>
                </View>
            </TouchableOpacity>

            {/* Stats */}
            <View style={styles.statsRow}>
                <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="wallet-outline" size={16} color={theme.primary} />
                    <Text style={[styles.statVal, { color: theme.text }]}>{formatPrice(todayEarnings)} ₴</Text>
                    <Text style={[styles.statLab, { color: theme.textSecondary }]}>
                        {locale === 'en' ? 'Earnings' : 'Заробіток'}
                    </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="checkmark-done" size={16} color="#2ECC71" />
                    <Text style={[styles.statVal, { color: theme.text }]}>{completedOrders.length}</Text>
                    <Text style={[styles.statLab, { color: theme.textSecondary }]}>
                        {locale === 'en' ? 'Done' : 'Виконано'}
                    </Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <Ionicons name="flash" size={16} color="#F39C12" />
                    <Text style={[styles.statVal, { color: theme.text }]}>{activeOrders.length}</Text>
                    <Text style={[styles.statLab, { color: theme.textSecondary }]}>
                        {locale === 'en' ? 'Active' : 'Активні'}
                    </Text>
                </View>
            </View>

            {/* Tabs */}
            <View style={[styles.tabRow, { backgroundColor: theme.input }]}>
                {TABS.map((tab) => {
                    const active = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tab,
                                active && [styles.tabActive, { backgroundColor: theme.card, shadowColor: '#000' }],
                            ]}
                            onPress={() => {
                                Haptics.selectionAsync().catch(() => null);
                                setActiveTab(tab.id);
                            }}
                            activeOpacity={0.75}
                        >
                            <Ionicons
                                name={tab.icon}
                                size={13}
                                color={active ? theme.primary : theme.textSecondary}
                            />
                            <Text style={[
                                styles.tabText,
                                { color: active ? theme.primary : theme.textSecondary },
                                active && styles.tabTextActive,
                            ]}>
                                {tab.label}
                            </Text>
                            {tab.count > 0 && (
                                <View style={[styles.tabBadge, {
                                    backgroundColor: active ? `${theme.primary}20` : theme.separator,
                                }]}>
                                    <Text style={[styles.tabBadgeText, {
                                        color: active ? theme.primary : theme.textSecondary,
                                    }]}>
                                        {tab.count}
                                    </Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* List */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.list}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor={theme.primary}
                        colors={[theme.primary]}
                    />
                }
            >
                {isLoading && !refreshing && activeOrders.length === 0 && availableOrders.length === 0 ? (
                    <ActivityIndicator color={theme.primary} size="large" style={{ marginTop: 40 }} />
                ) : (
                    <>
                        {activeTab === 'active' && (
                            activeOrders.length > 0
                                ? activeOrders.map(o => renderCard(o, 'active'))
                                : renderEmpty(
                                    'bicycle-outline',
                                    locale === 'en' ? 'No active orders' : 'Немає активних замовлень',
                                    locale === 'en'
                                        ? 'Accept an order from the Available tab.'
                                        : 'Прийміть замовлення з вкладки "Доступні".'
                                )
                        )}

                        {activeTab === 'available' && (
                            !isOnline
                                ? renderEmpty(
                                    'power-outline',
                                    locale === 'en' ? 'You\'re offline' : 'Ви офлайн',
                                    locale === 'en'
                                        ? 'Go online to see available orders.'
                                        : 'Увімкніть онлайн, щоб бачити замовлення.',
                                    { label: locale === 'en' ? 'Go Online' : 'Вийти на зміну', icon: 'power', fn: toggleOnline }
                                )
                                : availableOrders.length > 0
                                    ? availableOrders.map(o => renderCard(o, 'available'))
                                    : renderEmpty(
                                        'search-outline',
                                        locale === 'en' ? 'No orders nearby' : 'Немає замовлень поблизу',
                                        locale === 'en'
                                            ? 'Waiting for new orders in your area...'
                                            : 'Очікування нових замовлень у вашому районі...'
                                    )
                        )}

                        {activeTab === 'history' && (
                            completedOrders.length > 0 ? (
                                <>
                                    {completedOrders.slice(0, 10).map(o => renderCard(o, 'history'))}
                                    <TouchableOpacity
                                        style={[styles.statsBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
                                        onPress={() => router.push('/courier-earnings')}
                                        activeOpacity={0.85}
                                    >
                                        <Ionicons name="stats-chart" size={15} color={theme.primary} />
                                        <Text style={[styles.statsBtnText, { color: theme.primary }]}>
                                            {locale === 'en' ? 'Full statistics' : 'Повна статистика'}
                                        </Text>
                                        <Ionicons name="chevron-forward" size={15} color={theme.primary} style={{ marginLeft: 'auto' }} />
                                    </TouchableOpacity>
                                </>
                            ) : renderEmpty(
                                'time-outline',
                                locale === 'en' ? 'No history yet' : 'Історія порожня',
                                locale === 'en'
                                    ? 'Completed deliveries appear here.'
                                    : 'Виконані замовлення відображатимуться тут.'
                            )
                        )}
                    </>
                )}
            </ScrollView>

            <CourierOrderSheet
                visible={sheetVisible}
                onClose={() => { setSheetVisible(false); setSelectedOrder(null); }}
                order={selectedOrder}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },

    // Online card
    onlineCard: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between',
        borderRadius: 24, padding: 18, marginBottom: 16,
        borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 2 }
        })
    },
    onlineLeft:  { flexDirection: 'row', alignItems: 'center' },
    dotWrap:     { width: 18, height: 18, justifyContent: 'center', alignItems: 'center' },
    dotRing:     { position: 'absolute', width: 18, height: 18, borderRadius: 9 },
    dot:         { width: 10, height: 10, borderRadius: 5 },
    onlineLabel: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2 },
    onlineSync:  { fontSize: 11, marginTop: 2, fontWeight: '600' },
    onlineToggle:{
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, gap: 6,
    },
    onlineToggleText: { fontSize: 13, fontWeight: '700' },

    // Stats
    statsRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
    statCard: {
        flex: 1, borderRadius: 20, paddingVertical: 14, paddingHorizontal: 10,
        alignItems: 'center', borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 1 }
        })
    },
    statVal: { fontSize: 18, fontWeight: '900', marginTop: 6, letterSpacing: -0.4 },
    statLab: { fontSize: 11, fontWeight: '700', marginTop: 2 },

    // Tabs
    tabRow: {
        flexDirection: 'row', borderRadius: 16,
        padding: 4, marginBottom: 16,
    },
    tab: {
        flex: 1, flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', paddingVertical: 10,
        borderRadius: 12, gap: 6,
    },
    tabActive: {
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08, shadowRadius: 4, elevation: 2,
    },
    tabText:       { fontSize: 12, fontWeight: '700' },
    tabTextActive: { fontWeight: '800' },
    tabBadge:      { borderRadius: 8, paddingHorizontal: 5, paddingVertical: 1 },
    tabBadgeText:  { fontSize: 10, fontWeight: '800' },

    // List
    list: { paddingBottom: 100 },

    // Card matching orders.js exactly
    card: { 
        borderRadius: 24, marginBottom: 16, 
        borderWidth: StyleSheet.hairlineWidth, 
        padding: 18, 
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 2 }
        })
    },
    cardDimmed: { opacity: 0.5 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
    row: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    orderTitle: { fontSize: 16, fontWeight: '900' },
    date: { fontSize: 13, color: 'gray', marginTop: 4, fontWeight: '600' },
    price: { fontSize: 20, fontWeight: '900' },
    divider: { height: StyleSheet.hairlineWidth, marginVertical: 12 },
    
    // Route Row
    routeContainer: { paddingHorizontal: 2 },
    routeRow: { flexDirection: 'row', alignItems: 'center' },
    routeText: { fontSize: 13, fontWeight: '500', flex: 1 },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    statusBadge: { 
        flexDirection: 'row', alignItems: 'center', 
        paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20,
        borderWidth: StyleSheet.hairlineWidth,
    },
    detailsBtn: { flexDirection: 'row', alignItems: 'center' },
    detailsText: { color: '#000000', fontWeight: '600', marginRight: 4 },
    mapActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    mapActionText: {
        fontSize: 13,
        fontWeight: '700',
    },

    // Empty
    emptyWrap:    { alignItems: 'center', paddingHorizontal: 24, marginTop: 32 },
    emptyIconWrap:{ width: 72, height: 72, borderRadius: 36, justifyContent: 'center', alignItems: 'center', marginBottom: 14 },
    emptyTitle:   { fontSize: 17, fontWeight: '700', marginBottom: 7, letterSpacing: -0.3 },
    emptySub:     { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
    emptyBtn:     { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12 },
    emptyBtnOutline: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, borderWidth: 1.5 },
    emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },

    // Stats button
    statsBtn:     { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 16, marginTop: 6, borderWidth: StyleSheet.hairlineWidth },
    statsBtnText: { fontWeight: '600', fontSize: 14 },
});
