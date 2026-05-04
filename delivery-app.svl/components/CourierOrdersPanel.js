import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, ScrollView, RefreshControl, Switch, Platform } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import CourierOrderSheet from './CourierOrderSheet';
import { fetchCourierOrders, setOnlineStatus } from '../store/courierSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { courierUpdateLocation } from '../src/api';
import * as Location from 'expo-location';

export default function CourierOrdersPanel() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const dispatch = useDispatch();
    const router = useRouter();

    const { 
        availableOrders = [], 
        activeOrders = [], 
        completedOrders = [], 
        isLoading = false, 
        isOnline = false 
    } = useSelector((state) => state.courier || {});
    const user = useSelector((state) => state.auth.user);
    
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());
    const [activeTab, setActiveTab] = useState('available'); // 'active', 'available', 'history'

    // Automatically switch to active tab if there are active orders and we just loaded
    useEffect(() => {
        if (activeOrders.length > 0 && activeTab === 'available' && !isLoading) {
            setActiveTab('active');
        }
    }, [activeOrders.length, isLoading]);

    // Online status is local-only (backend /courier/status endpoint does not exist yet).
    const toggleOnlineStatus = () => {
        dispatch(setOnlineStatus(!isOnline));
    };

    const openOrderDetails = (order) => {
        setSelectedOrder(order);
        setSheetVisible(true);
    };

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await dispatch(fetchCourierOrders());
        setLastSync(new Date().toLocaleTimeString());
        setRefreshing(false);
    }, [dispatch]);

    useEffect(() => {
        dispatch(fetchCourierOrders());
        const interval = setInterval(() => {
            dispatch(fetchCourierOrders());
            setLastSync(new Date().toLocaleTimeString());
        }, 15000);
        return () => clearInterval(interval);
    }, [dispatch]);

    useEffect(() => {
        let locationSubscription = null;

        const startLocationTracking = async () => {
            if (isOnline) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        dispatch(setOnlineStatus(false));
                        return;
                    }

                    locationSubscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.Balanced,
                            timeInterval: 15000,
                            distanceInterval: 10,
                        },
                        async (location) => {
                            const { latitude, longitude } = location.coords;
                            try {
                                await courierUpdateLocation(latitude, longitude);
                                console.log(`GPS Synced: ${latitude}, ${longitude}`);
                            } catch (e) {
                                console.log('Location update stub error:', e.message);
                            }
                        }
                    );
                } catch (error) {
                    console.warn('Error tracking location:', error);
                }
            } else {
                if (locationSubscription) {
                    locationSubscription.remove();
                    locationSubscription = null;
                }
            }
        };

        startLocationTracking();

        return () => {
            if (locationSubscription) {
                locationSubscription.remove();
            }
        };
    }, [isOnline]);

    const renderOrderCard = (item, type) => {
        const isActive = type === 'active';
        const isHistory = type === 'history';
        const currentUserId = user?.userId || user?.id;
        const isMine = Number(item.courierId) === Number(currentUserId);
        const isBookedByOther = !isActive && !isHistory && item.isBooked && !isMine;

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[
                    styles.cardWrapper,
                    isActive && styles.activeCardWrapper,
                ]}
                onPress={() => openOrderDetails(item)}
            >
                <BlurView 
                    intensity={isDark ? 30 : 60} 
                    tint={isDark ? 'dark' : 'light'} 
                    style={[
                        styles.card,
                        { 
                            borderColor: isActive ? '#e334e3' : (isBookedByOther ? '#e74c3c' : (isHistory ? '#eee' : theme.border)),
                            borderWidth: (isActive || isBookedByOther) ? 2 : 1,
                            opacity: isBookedByOther ? 0.7 : 1
                        }
                    ]}
                >
                    <View style={styles.cardHeader}>
                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: isActive ? '#e334e3' : (isHistory ? '#f0f0f0' : theme.input) }]}>
                            <Ionicons
                                name={isHistory ? "checkmark-circle" : "bicycle"}
                                size={22}
                                color={isActive ? "white" : (isHistory ? "#2ecc71" : "#e334e3")}
                            />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <View style={styles.rowBetween}>
                                <View style={styles.row}>
                                    <Text style={[styles.orderIdLabel, { color: theme.textSecondary }]}>{formatOrderNumber(item.id)}</Text>
                                    {isMine && !isHistory && !isActive && (
                                        <View style={[styles.myLabel, { marginLeft: 8 }]}>
                                            <Text style={styles.myLabelText}>{locale === 'en' ? 'MY' : 'МОЄ'}</Text>
                                        </View>
                                    )}
                                </View>
                                <Text style={[styles.earnings, { color: '#e334e3' }]}>{item.totalPrice} ₴</Text>
                            </View>
                            <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.restaurantName}
                            </Text>
                            <View style={[styles.row, { marginTop: 4 }]}>
                                <Ionicons name="location-outline" size={14} color={isActive ? '#e334e3' : theme.textSecondary} />
                                <Text style={[styles.addressText, { color: theme.textSecondary, fontWeight: isActive ? '600' : '400' }]} numberOfLines={1}>
                                    {(isActive || isMine || isHistory) ? item.address : (locale === 'en' ? 'Address hidden (Book first)' : 'Адреса прихована (Забронюйте)')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {!isHistory && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.cardFooter}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                <View style={[styles.statusBadge, { backgroundColor: item.status === 'delivering' ? '#e334e320' : (item.status === 'ready_for_pickup' ? '#2ecc7120' : '#3498db20') }]}>
                                    <Text style={{ color: item.status === 'delivering' ? '#e334e3' : (item.status === 'ready_for_pickup' ? '#2ecc71' : '#3498db'), fontWeight: 'bold', fontSize: 12 }}>
                                        {item.status === 'delivering'
                                            ? (locale === 'en' ? 'In Delivery' : 'Доставляється')
                                            : (item.status === 'ready_for_pickup'
                                                ? (locale === 'en' ? 'Ready' : 'Готово')
                                                : (item.status === 'preparing'
                                                    ? (locale === 'en' ? 'Preparing' : 'Готується')
                                                    : (item.status === 'accepted'
                                                        ? (locale === 'en' ? 'Confirmed' : 'Підтверджено')
                                                        : (locale === 'en' ? 'New' : 'Нове'))))}
                                    </Text>
                                </View>
                                
                                {isBookedByOther ? (
                                    <View style={[styles.statusBadge, { backgroundColor: '#e74c3c25', marginLeft: 8, borderWidth: 1, borderColor: '#e74c3c' }]}>
                                        <Ionicons name="lock-closed" size={12} color="#e74c3c" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#e74c3c', fontWeight: '900', fontSize: 11, textTransform: 'uppercase' }}>
                                            {locale === 'en' ? 'Booked' : 'Заброньовано'}
                                        </Text>
                                    </View>
                                ) : (!isActive && !isHistory) && (
                                    <View style={[styles.statusBadge, { backgroundColor: '#2ecc7115', marginLeft: 8, borderWidth: 1, borderColor: '#2ecc7140' }]}>
                                        <Ionicons name="lock-open-outline" size={10} color="#2ecc71" style={{ marginRight: 4 }} />
                                        <Text style={{ color: '#2ecc71', fontWeight: 'bold', fontSize: 11, textTransform: 'uppercase' }}>
                                            {locale === 'en' ? 'Free' : 'Вільне'}
                                        </Text>
                                    </View>
                                )}
                            </View>
                            <View style={styles.detailsBtn}>
                                <Text style={styles.detailsText}>{locale === 'en' ? 'Details' : 'Деталі'}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#e334e3" />
                            </View>
                        </View>
                    </>
                )}
                </BlurView>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = (icon, title, subtitle) => (
        <View style={styles.emptyStateWrapper}>
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.emptyStateCard, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={styles.emptyIconCircle}>
                    <Ionicons name={icon} size={48} color="#e334e3" style={{ opacity: 0.6 }} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>{title}</Text>
                <Text style={styles.emptySubtitle}>{subtitle}</Text>
                <TouchableOpacity style={styles.emptyBtn} onPress={onRefresh}>
                    <Ionicons name="refresh" size={16} color="#e334e3" />
                    <Text style={styles.emptyBtnText}>{locale === 'en' ? 'Refresh' : 'Оновити'}</Text>
                </TouchableOpacity>
            </BlurView>
        </View>
    );

    const renderOfflineState = () => (
        <View style={styles.emptyStateWrapper}>
            <BlurView intensity={isDark ? 30 : 50} tint={isDark ? 'dark' : 'light'} style={[styles.emptyStateCard, { borderColor: 'rgba(255,255,255,0.1)' }]}>
                <View style={[styles.emptyIconCircle, { backgroundColor: '#f0f0f0' }]}>
                    <Ionicons name="power-outline" size={48} color="gray" style={{ opacity: 0.6 }} />
                </View>
                <Text style={[styles.emptyTitle, { color: theme.text }]}>
                    {locale === 'en' ? 'You are offline' : 'Ви офлайн'}
                </Text>
                <Text style={styles.emptySubtitle}>
                    {locale === 'en'
                        ? 'Turn on your status to start receiving delivery orders.'
                        : 'Увімкніть статус "На зміні", щоб бачити замовлення та почати заробляти.'}
                </Text>
                <TouchableOpacity style={[styles.emptyBtn, { backgroundColor: '#e334e3' }]} onPress={toggleOnlineStatus}>
                    <Ionicons name="power" size={16} color="white" />
                    <Text style={[styles.emptyBtnText, { color: 'white' }]}>
                        {locale === 'en' ? 'Go Online' : 'Вийти на зміну'}
                    </Text>
                </TouchableOpacity>
            </BlurView>
        </View>
    );

    const tabs = [
        { id: 'active', label: locale === 'en' ? 'Active' : 'Активні', count: activeOrders.length },
        { id: 'available', label: locale === 'en' ? 'Available' : 'Доступні', count: availableOrders.length },
        { id: 'history', label: locale === 'en' ? 'History' : 'Історія', count: (completedOrders || []).length },
    ];

    return (
        <View style={styles.mainContainer}>
            {/* Header / Status Section */}
            <View style={styles.syncHeaderWrapper}>
                <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.syncHeaderBlur}>
                    <TouchableOpacity 
                        activeOpacity={0.8}
                        onPress={toggleOnlineStatus}
                        style={[
                            styles.syncHeader, 
                            {   
                                backgroundColor: isOnline ? '#2ecc7115' : 'transparent',
                                borderColor: isOnline ? '#2ecc7140' : (isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                                borderWidth: 1,
                            }
                        ]}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <View style={[
                                styles.statusDot, 
                                { 
                                    backgroundColor: isOnline ? '#2ecc71' : '#95a5a6',
                                    shadowColor: isOnline ? '#2ecc71' : 'transparent',
                                    shadowOpacity: 0.8,
                                    shadowRadius: 10,
                                }
                            ]} />
                            <View style={{ marginLeft: 12 }}>
                                <Text style={[
                                    styles.syncText, 
                                    { color: isOnline ? '#2ecc71' : theme.textSecondary }
                                ]}>
                                    {isOnline 
                                        ? (locale === 'en' ? 'Online' : 'На зміні') 
                                        : (locale === 'en' ? 'Offline' : 'Офлайн')}
                                </Text>
                                <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 2 }}>
                                    {locale === 'en' ? 'Last synced:' : 'Оновлено:'} {lastSync}
                                </Text>
                            </View>
                        </View>
                        <Ionicons 
                            name={isOnline ? "radio-button-on" : "radio-button-off"} 
                            size={28} 
                            color={isOnline ? "#2ecc71" : "#95a5a6"} 
                        />
                    </TouchableOpacity>
                </BlurView>
            </View>

            {/* Quick Stats Dashboard */}
            <View style={styles.statsGrid}>
                <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={styles.statItem}>
                    <Ionicons name="wallet-outline" size={20} color="#e334e3" />
                    <Text style={[styles.statValue, { color: theme.text }]}>
                        {(completedOrders || []).reduce((sum, o) => sum + (Number(o.earnings) || 0), 0)} ₴
                    </Text>
                    <Text style={styles.statLabel}>{locale === 'en' ? 'Earnings' : 'Дохід'}</Text>
                </BlurView>
                <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={styles.statItem}>
                    <Ionicons name="checkmark-done" size={20} color="#2ecc71" />
                    <Text style={[styles.statValue, { color: theme.text }]}>{(completedOrders || []).length}</Text>
                    <Text style={styles.statLabel}>{locale === 'en' ? 'Done' : 'Завершено'}</Text>
                </BlurView>
                <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={styles.statItem}>
                    <Ionicons name="time-outline" size={20} color="#3498db" />
                    <Text style={[styles.statValue, { color: theme.text }]}>{activeOrders.length}</Text>
                    <Text style={styles.statLabel}>{locale === 'en' ? 'Active' : 'Активні'}</Text>
                </BlurView>
            </View>

            {/* Custom Segmented Control Tabs */}
            <View style={styles.tabContainerWrapper}>
                <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.tabContainer}>
                {tabs.map((tab) => {
                    const isActiveTab = activeTab === tab.id;
                    return (
                        <TouchableOpacity
                            key={tab.id}
                            style={[
                                styles.tabButton,
                                isActiveTab && { backgroundColor: theme.card, shadowColor: '#000', elevation: 2 }
                            ]}
                            onPress={() => setActiveTab(tab.id)}
                        >
                            <Text style={[
                                styles.tabText,
                                { color: isActiveTab ? theme.text : theme.textSecondary, fontWeight: isActiveTab ? 'bold' : '500' }
                            ]}>
                                {tab.label}
                            </Text>
                            {tab.count > 0 && (
                                <View style={[styles.badge, isActiveTab && styles.activeBadge]}>
                                    <Text style={[styles.badgeText, isActiveTab && styles.activeBadgeText]}>{tab.count}</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    );
                })}
                </BlurView>
            </View>

            {/* Content Area */}
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e334e3" />}
            >
                {isLoading && !refreshing && activeOrders.length === 0 && availableOrders.length === 0 ? (
                    <ActivityIndicator color="#e334e3" style={{ marginTop: 40 }} size="large" />
                ) : (
                    <View style={styles.contentSection}>
                        {activeTab === 'active' && (
                            activeOrders.length > 0
                                ? activeOrders.map(order => renderOrderCard(order, 'active'))
                                : renderEmptyState(
                                    'bicycle-outline',
                                    locale === 'en' ? 'No Active Tasks' : 'Немає активних завдань',
                                    locale === 'en' ? 'You have not accepted any orders yet.' : 'Ви ще не прийняли жодного замовлення.'
                                )
                        )}

                        {activeTab === 'available' && (
                            !isOnline 
                                ? renderOfflineState()
                                : availableOrders.length > 0
                                    ? availableOrders.map(order => renderOrderCard(order, 'available'))
                                    : renderEmptyState(
                                        'search-outline',
                                        locale === 'en' ? 'No orders in the pool' : 'У пулі немає замовлень',
                                        locale === 'en' ? 'Wait for new orders to appear in your area.' : 'Зачекайте на появу нових замовлень у вашому районі.'
                                    )
                        )}

                        {activeTab === 'history' && (
                            completedOrders.length > 0 ? (
                                <>
                                    {completedOrders.slice(0, 10).map(order => renderOrderCard(order, 'history'))}
                                    <TouchableOpacity style={styles.viewEarningsBtn} onPress={() => router.push('/courier-earnings')}>
                                        <Ionicons name="wallet" size={20} color="white" style={{ marginRight: 8 }} />
                                        <Text style={styles.viewEarningsBtnText}>
                                            {locale === 'en' ? 'View Full History & Earnings' : 'Уся історія та заробіток'}
                                        </Text>
                                    </TouchableOpacity>
                                </>
                            ) : renderEmptyState(
                                'time-outline',
                                locale === 'en' ? 'No History Yet' : 'Історія порожня',
                                locale === 'en' ? 'Completed orders will appear here.' : 'Завершені замовлення з\'являться тут.'
                            )
                        )}
                    </View>
                )}
            </ScrollView>

            <CourierOrderSheet
                visible={sheetVisible}
                onClose={() => {
                    setSheetVisible(false);
                    setSelectedOrder(null);
                }}
                order={selectedOrder}
            />
        </View>
    );
}

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
    },
    syncHeaderWrapper: {
        marginBottom: 12,
        borderRadius: 20,
        overflow: 'hidden',
    },
    syncHeaderBlur: {
        borderRadius: 20,
    },
    syncHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 14,
        borderRadius: 20,
    },
    syncText: {
        fontSize: 17,
        fontWeight: 'bold',
        marginLeft: 10,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        shadowOpacity: 0.8, 
        shadowRadius: 6, 
        shadowOffset: { width: 0, height: 0 }
    },
    statsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
        gap: 10,
    },
    statItem: {
        flex: 1,
        padding: 12,
        borderRadius: 18,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden',
    },
    statValue: {
        fontSize: 16,
        fontWeight: '800',
        marginVertical: 4,
    },
    statLabel: {
        fontSize: 10,
        color: '#8e8e93',
        textTransform: 'uppercase',
        fontWeight: 'bold',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    tabContainerWrapper: {
        marginBottom: 16,
        borderRadius: 18,
        overflow: 'hidden',
    },
    tabContainer: {
        flexDirection: 'row',
        padding: 4,
    },
    tabButton: {
        flex: 1,
        flexDirection: 'row',
        paddingVertical: 10,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 14,
    },
    tabText: {
        fontSize: 14,
    },
    badge: {
        backgroundColor: 'rgba(0,0,0,0.1)',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        marginLeft: 6,
    },
    activeBadge: {
        backgroundColor: '#e334e3',
    },
    badgeText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: 'gray',
    },
    activeBadgeText: {
        color: 'white',
    },
    contentSection: {
        paddingBottom: 20,
    },
    cardWrapper: {
        marginBottom: 14,
        borderRadius: 24,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 15, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 4 },
        }),
    },
    activeCardWrapper: {
        ...Platform.select({
            ios: { shadowColor: '#e334e3', shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
            android: { elevation: 8 },
        }),
    },
    card: {
        borderRadius: 24,
        padding: 16,
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    iconBox: {
        width: 48,
        height: 48,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center'
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    orderIdLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        opacity: 0.6,
        textTransform: 'uppercase',
    },
    orderTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginVertical: 4,
    },
    addressText: {
        fontSize: 13,
        marginLeft: 4,
        flex: 1
    },
    earnings: {
        fontSize: 18,
        fontWeight: '900'
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginVertical: 16
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    detailsText: {
        color: '#e334e3',
        fontWeight: '700',
        marginRight: 4,
        fontSize: 14
    },
    myLabel: {
        backgroundColor: '#e334e3',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    myLabelText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
    },
    viewEarningsBtn: {
        backgroundColor: '#e334e3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 16,
        marginTop: 10,
        shadowColor: '#e334e3',
        shadowOpacity: 0.3,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 4 },
        elevation: 4
    },
    viewEarningsBtnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    emptyStateWrapper: {
        marginTop: 20,
        borderRadius: 28,
        overflow: 'hidden',
    },
    emptyStateCard: {
        borderRadius: 28,
        borderWidth: 1,
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
        borderStyle: 'dashed',
    },
    emptyIconCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#e334e315',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    emptySubtitle: {
        color: 'gray',
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 20,
    },
    emptyBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#e334e315',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 14,
    },
    emptyBtnText: {
        color: '#e334e3',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 15,
    }
});

