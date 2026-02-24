import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector, useDispatch } from 'react-redux';
import { updateOrderStatus } from '../store/ordersSlice';
import * as LiveActivity from 'expo-live-activity';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function DriverAdminScreen() {
    const router = useRouter();
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';

    const orders = useSelector(state => state.orders.orders);

    // Status mapping
    const statuses = [
        { id: 'accepted', label: 'Прийнято ✅', next: 'preparing' },
        { id: 'preparing', label: 'Готується 👨‍🍳', next: 'delivering' },
        { id: 'delivering', label: 'В дорозі 🛵', next: 'completed' },
        { id: 'completed', label: 'Доставлено 🎉', next: null }
    ];

    const handleUpdateStatus = async (order, nextStatusId) => {
        const timestamp = Date.now();

        // 1. Oновлюємо Redux State
        dispatch(updateOrderStatus({
            orderId: order.id,
            status: nextStatusId,
            timestamp
        }));

        // 2. Симулюємо "штучний інтелект" для прорахунку часу
        // Наприклад, якщо ми переходимо в "Готується", ШІ вирішує, що час буде 18 хвилин
        const mockAITimes = {
            accepted: '24 min',
            preparing: '18 min',
            delivering: '8 min',
            completed: 'Delivered'
        };

        // Оновлена мапа таймстемпів для Live Activity
        const currentTimestamps = order.statusTimestamps || {};
        const newTimestamps = { ...currentTimestamps, [nextStatusId]: timestamp };

        const rideData = JSON.stringify({
            status: nextStatusId,
            driverName: "Олександр (ШІ Диспетчер)",
            time: mockAITimes[nextStatusId],
            orderId: order.id.slice(-4),
            totalPrice: `${order.total?.toFixed(0) || '0'} ₴`,
            timestamp: timestamp, // Тригер для оновлення SwiftUI
            timestamps: newTimestamps
        });

        const title = `Замовлення ${statuses.find(s => s.id === nextStatusId)?.label}`;

        try {
            if (Platform.OS === 'ios') {
                // Якщо статусу ще не було (Live Activity щойно створено при чекауті)
                // Або якщо ми оновлюємо
                await LiveActivity.startActivity(title, rideData);

                if (nextStatusId === 'completed') {
                    setTimeout(async () => {
                        await LiveActivity.endActivity(title, rideData);
                    }, 5000);
                }
            }
        } catch (e) {
            console.log("Live Activity Error:", e);
        }
    };

    const renderOrder = ({ item }) => {
        const currentStatusConfig = statuses.find(s => s.id === item.status) || statuses[0];
        const isCompleted = item.status === 'completed';

        return (
            <View style={[styles.orderCard, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF' }]}>
                <View style={styles.cardHeader}>
                    <Text style={[styles.orderId, { color: isDark ? 'white' : 'black' }]}>
                        #{item.id.slice(-4)}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: isCompleted ? '#34C759' : '#007AFF' }]}>
                        <Text style={styles.statusText}>{currentStatusConfig.label}</Text>
                    </View>
                </View>

                <Text style={{ color: 'gray', marginBottom: 12 }}>
                    {item.items?.length || 0} позицій • {item.total?.toFixed(0)} ₴
                </Text>

                {!isCompleted && currentStatusConfig.next && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleUpdateStatus(item, currentStatusConfig.next)}
                    >
                        <Text style={styles.actionText}>
                            ➡️ Змінити на: {statuses.find(s => s.id === currentStatusConfig.next)?.label}
                        </Text>
                    </TouchableOpacity>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F2F2F7' }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={isDark ? 'white' : 'black'} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: isDark ? 'white' : 'black' }]}>Admin Panel</Text>
                <View style={{ width: 24 }} />
            </View>

            <FlatList
                data={orders}
                keyExtractor={item => item.id}
                renderItem={renderOrder}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Text style={{ color: 'gray', fontSize: 16 }}>Немає активних замовлень</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    listContent: { padding: 16 },
    orderCard: {
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 5,
        shadowOffset: { width: 0, height: 2 },
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    orderId: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
    },
    actionButton: {
        backgroundColor: '#E22BC6',
        padding: 12,
        borderRadius: 12,
        alignItems: 'center',
    },
    actionText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 15,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 50,
    }
});
