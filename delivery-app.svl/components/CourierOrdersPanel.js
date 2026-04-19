import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, useColorScheme, ActivityIndicator, ScrollView, RefreshControl, Switch } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import CourierOrderSheet from './CourierOrderSheet';
import { fetchCourierOrders, setOnlineStatus } from '../store/courierSlice';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { courierSetOnlineStatus, courierUpdateLocation } from '../src/api';
import * as Location from 'expo-location';

export default function CourierOrdersPanel() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const dispatch = useDispatch();
    const router = useRouter();

    const { availableOrders, activeOrder, completedOrders, isLoading, isOnline } = useSelector((state) => state.courier);
    const user = useSelector((state) => state.auth.user);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [sheetVisible, setSheetVisible] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [lastSync, setLastSync] = useState(new Date().toLocaleTimeString());

    const toggleOnlineStatus = async () => {
        const newVal = !isOnline;
        // Optimistic update
        dispatch(setOnlineStatus(newVal));
        try {
            await courierSetOnlineStatus(newVal);
        } catch (e) {
            console.log('Status update error', e.message);
            // Rollback on error
            dispatch(setOnlineStatus(!newVal));
        }
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
        }, 15000); // 15s auto-refresh
        return () => clearInterval(interval);
    }, [dispatch]);

    // Live GPS tracking tied to `isOnline` status
    useEffect(() => {
        let locationSubscription = null;

        const startLocationTracking = async () => {
            if (isOnline) {
                try {
                    const { status } = await Location.requestForegroundPermissionsAsync();
                    if (status !== 'granted') {
                        dispatch(setOnlineStatus(false)); // Must grant location to be online
                        return;
                    }

                    locationSubscription = await Location.watchPositionAsync(
                        {
                            accuracy: Location.Accuracy.Balanced,
                            timeInterval: 15000,   // Once every 15 seconds
                            distanceInterval: 10,  // Or every 10 meters
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

    const getReadyByTime = (item) => {
        if (!item.createdAt || !item.cookingTimeMinutes) return null;
        try {
            const createdDate = new Date(item.createdAt);
            if (isNaN(createdDate.getTime())) return null;
            const readyByDate = new Date(createdDate.getTime() + item.cookingTimeMinutes * 60000);
            return readyByDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return null;
        }
    };

    const renderOrderCard = (item, type = 'available') => {
        const isActive = type === 'active';
        const isHistory = type === 'history';

        return (
            <TouchableOpacity
                key={item.id}
                activeOpacity={0.8}
                style={[
                    styles.card,
                    { backgroundColor: theme.card, borderColor: isActive ? '#e334e3' : (isHistory ? '#eee' : theme.border) },
                    isActive && styles.activeCard,
                    isHistory && { opacity: 0.8 }
                ]}
                onPress={() => openOrderDetails(item)}
            >
                <View style={styles.cardHeader}>
                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: isActive ? '#e334e3' : (isHistory ? '#f0f0f0' : theme.input) }]}>
                            <Ionicons
                                name={isHistory ? "checkmark-circle" : "bicycle"}
                                size={20}
                                color={isActive ? "white" : (isHistory ? "#2ecc71" : "#e334e3")}
                            />
                        </View>
                        <View style={{ marginLeft: 10, flex: 1 }}>
                            <View style={styles.rowBetween}>
                                <Text style={[styles.orderIdLabel, { color: theme.textSecondary }]}>{formatOrderNumber(item.id)}</Text>
                                <Text style={[styles.earnings, { color: '#e334e3' }]}>{item.totalPrice} ₴</Text>
                            </View>
                            <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.restaurantName}
                            </Text>
                            <View style={[styles.row, { marginTop: 4 }]}>
                                <Ionicons name="location-outline" size={14} color={isActive ? '#e334e3' : theme.textSecondary} />
                                <Text style={[styles.addressText, { color: theme.textSecondary, fontWeight: isActive ? '600' : '400' }]} numberOfLines={1}>
                                    {(isActive || (item.courierId && item.courierId !== 0 && item.courierId !== '0')) ? item.address : (locale === 'en' ? 'Address hidden (Book first)' : 'Адреса прихована (Забронюйте)')}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {!isHistory && (
                    <>
                        <View style={styles.divider} />
                        <View style={styles.cardFooter}>
                            <View style={[styles.statusBadge, { backgroundColor: isActive ? '#e334e320' : (item.status === 'ready_for_pickup' ? '#2ecc7120' : '#3498db20') }]}>
                                <Text style={{ color: isActive ? '#e334e3' : (item.status === 'ready_for_pickup' ? '#2ecc71' : '#3498db'), fontWeight: 'bold', fontSize: 12 }}>
                                    {isActive
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
                            <View style={styles.detailsBtn}>
                                <Text style={styles.detailsText}>{locale === 'en' ? 'Details' : 'Деталі'}</Text>
                                <Ionicons name="chevron-forward" size={16} color="#e334e3" />
                            </View>
                        </View>
                    </>
                )}
            </TouchableOpacity>
        );
    };

    const emptyState = (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="bicycle-outline" size={48} color="gray" style={{ opacity: 0.3 }} />
            <Text style={{ color: theme.text, marginTop: 15, fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                {locale === 'en' ? 'No orders in the pool' : 'У пулі немає замовлень'}
            </Text>
            <Text style={{ color: 'gray', marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
                {locale === 'en'
                    ? 'We show orders that are Pending, Accepted, or Preparing. If you don\'t see any, restaurants might not have active orders yet.'
                    : 'Ми показуємо замовлення, які очікують, прийняті або готуються. Якщо ви нічого не бачите, можливо, у ресторанів ще немає активних замовлень.'}
            </Text>
            <TouchableOpacity
                style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center' }}
                onPress={onRefresh}
            >
                <Ionicons name="refresh" size={16} color="#e334e3" />
                <Text style={{ color: '#e334e3', marginLeft: 5, fontWeight: 'bold' }}>
                    {locale === 'en' ? 'Check again' : 'Перевірити знову'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    const offlineState = (
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border, alignItems: 'center', paddingVertical: 40 }]}>
            <Ionicons name="power-outline" size={48} color="gray" style={{ opacity: 0.3 }} />
            <Text style={{ color: theme.text, marginTop: 15, fontSize: 16, textAlign: 'center', fontWeight: 'bold' }}>
                {locale === 'en' ? 'You are offline' : 'Ви офлайн'}
            </Text>
            <Text style={{ color: 'gray', marginTop: 8, fontSize: 14, textAlign: 'center', paddingHorizontal: 20 }}>
                {locale === 'en'
                    ? 'Turn on your status to start receiving delivery orders in your area.'
                    : 'Увімкніть статус "На зміні" вгорі екрану, щоб бачити активний пул замовлень та почати заробляти.'}
            </Text>
            <TouchableOpacity
                style={{ marginTop: 20, flexDirection: 'row', alignItems: 'center', backgroundColor: '#e334e320', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 12 }}
                onPress={toggleOnlineStatus}
            >
                <Ionicons name="power" size={16} color="#e334e3" />
                <Text style={{ color: '#e334e3', marginLeft: 8, fontWeight: 'bold' }}>
                    {locale === 'en' ? 'Go Online' : 'Вийти на зміну'}
                </Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <ScrollView
            showsVerticalScrollIndicator={false}
            refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#e334e3" />
            }
        >
            <View style={styles.container}>
                <TouchableOpacity 
                    activeOpacity={0.8}
                    onPress={toggleOnlineStatus}
                    style={[
                        styles.syncHeader, 
                        {   backgroundColor: isOnline ? '#2ecc7115' : theme.input,
                            borderColor: isOnline ? '#2ecc7140' : theme.border,
                            borderWidth: 1,
                            padding: 16
                        }
                    ]}
                >
                    <View style={styles.row}>
                        <View style={[
                            styles.statusDot, 
                            { 
                                backgroundColor: isOnline ? '#2ecc71' : 'gray',
                                width: 10, height: 10, borderRadius: 5,
                                shadowColor: isOnline ? '#2ecc71' : 'transparent',
                                shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }
                            }
                        ]} />
                        <Text style={[
                            styles.syncText, 
                            { color: isOnline ? '#2ecc71' : theme.textSecondary, fontWeight: 'bold', fontSize: 16 }
                        ]}>
                            {isOnline 
                                ? (locale === 'en' ? 'Online - Ready' : 'На зміні - Готовий') 
                                : (locale === 'en' ? 'Offline - Paused' : 'Офлайн - Пауза')}
                        </Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={{ color: theme.textSecondary, fontSize: 10, marginRight: 8 }}>{lastSync}</Text>
                        <Switch
                            trackColor={{ false: "#767577", true: "#2ecc71" }}
                            thumbColor={"#fff"}
                            ios_backgroundColor="#3e3e3e"
                            onValueChange={toggleOnlineStatus}
                            value={isOnline}
                            style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                        />
                    </View>
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Ionicons name="cube-outline" size={24} color="#e334e3" />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>
                        {locale === 'en' ? 'Courier Dashboard' : 'Панель кур\'єра'}
                    </Text>
                </View>

                {isLoading && !refreshing && !activeOrder && availableOrders.length === 0 && (
                    <ActivityIndicator color="#e334e3" style={{ marginBottom: 20 }} />
                )}

                {/* ACTIVE ORDER */}
                {activeOrder && (
                    <View style={styles.section}>
                        <Text style={[styles.subTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Current Task' : 'Поточне завдання'}
                        </Text>
                        {renderOrderCard(activeOrder, 'active')}
                    </View>
                )}

                {/* AVAILABLE ORDERS POOL */}
                <View style={styles.section}>
                    <View style={styles.rowBetween}>
                        <Text style={[styles.subTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Available Pool' : 'Пул доступних'}
                        </Text>
                        {isOnline && availableOrders.length > 0 && <View style={styles.poolBadge}><Text style={styles.poolBadgeText}>{availableOrders.length}</Text></View>}
                    </View>

                    {!isOnline ? offlineState : (
                        availableOrders.length > 0
                            ? availableOrders.map(order => renderOrderCard(order, 'available'))
                            : !activeOrder && emptyState
                    )}
                </View>

                {/* HISTORY */}
                {completedOrders.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.rowBetween}>
                            <Text style={[styles.subTitle, { color: theme.text, marginTop: 10 }]}>
                                {locale === 'en' ? 'Recent History' : 'Остання історія'}
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/courier-earnings')}>
                                <Text style={{ color: '#e334e3', fontWeight: 'bold' }}>{locale === 'en' ? 'View All' : 'Всі'}</Text>
                            </TouchableOpacity>
                        </View>
                        {completedOrders.slice(0, 5).map(order => renderOrderCard(order, 'history'))}
                        
                        <TouchableOpacity style={styles.viewEarningsBtn} onPress={() => router.push('/courier-earnings')}>
                            <Ionicons name="wallet" size={20} color="white" style={{ marginRight: 8 }} />
                            <Text style={styles.viewEarningsBtnText}>
                                {locale === 'en' ? 'Earnings & Full History' : 'Заробіток та вся історія'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                <CourierOrderSheet
                    visible={sheetVisible}
                    onClose={() => {
                        setSheetVisible(false);
                        setSelectedOrder(null);
                    }}
                    order={selectedOrder}
                />
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: 24,
    },
    section: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    subTitle: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 14,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        opacity: 0.6,
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    poolBadge: {
        backgroundColor: '#e334e3',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        marginBottom: 14,
    },
    poolBadgeText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    card: {
        borderRadius: 18,
        marginBottom: 12,
        borderWidth: 1.5,
        padding: 16,
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 8,
        shadowOffset: { width: 0, height: 4 }
    },
    activeCard: {
        shadowColor: '#e334e3',
        shadowOpacity: 0.2,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    iconBox: {
        width: 44,
        height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center'
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
        marginVertical: 2,
    },
    restaurantText: {
        fontSize: 13,
        color: 'gray',
        marginTop: 2
    },
    addressText: {
        fontSize: 12,
        marginLeft: 4,
        flex: 1
    },
    distance: {
        fontSize: 15,
        fontWeight: '700'
    },
    earnings: {
        fontSize: 16,
        fontWeight: 'bold'
    },
    divider: {
        height: 1,
        backgroundColor: '#eee',
        marginVertical: 14
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 20,
    },
    detailsBtn: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    syncHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 12,
        marginBottom: 16,
    },
    syncText: {
        fontSize: 12,
        fontWeight: '600',
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    detailsText: {
        color: '#e334e3',
        fontWeight: '700',
        marginRight: 4,
        fontSize: 14
    },
    viewEarningsBtn: {
        backgroundColor: '#e334e3',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
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
    }
});
