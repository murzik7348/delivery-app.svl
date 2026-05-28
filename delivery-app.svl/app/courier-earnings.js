import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { formatUkraineDate } from '../utils/dateUtils';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import BackButton from '../components/BackButton';

export default function CourierEarningsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const locale = useSelector((state) => state.language?.locale ?? 'uk');

    // Using completedOrders from Redux courierSlice
    const completedOrders = useSelector((state) => state.courier.completedOrders || []);

    // Calculate total earnings
    const totalEarnings = useMemo(() => {
        return completedOrders.reduce((sum, order) => sum + (Number(order.earnings) || 0), 0);
    }, [completedOrders]);

    const renderHistoryItem = ({ item }) => {
        const dateStr = formatUkraineDate(item.createdAt || new Date().toISOString());
        
        return (
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.cardHeader}>
                    <View style={styles.row}>
                        <View style={[styles.iconBox, { backgroundColor: '#2ecc7115' }]}>
                            <Ionicons name="checkmark-done" size={20} color="#2ecc71" />
                        </View>
                        <View style={{ marginLeft: 12, flex: 1 }}>
                            <Text style={[styles.orderTitle, { color: theme.text }]} numberOfLines={1}>
                                {item.restaurantName}
                            </Text>
                            <Text style={styles.date}>
                                #{formatOrderNumber(item.id)} • {dateStr}
                            </Text>
                        </View>
                    </View>
                    <Text style={[styles.price, { color: '#2ecc71' }]}>
                        + {item.earnings} ₴
                    </Text>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            {/* Header */}
            <View style={styles.header}>
                <BackButton color={theme.text} />
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {locale === 'en' ? 'Earnings History' : 'Історія заробітку'}
                </Text>
                <View style={{ width: 44 }} />
            </View>

            <FlatList
                data={completedOrders}
                keyExtractor={(item) => String(item.id)}
                contentContainerStyle={styles.list}
                showsVerticalScrollIndicator={false}
                ListHeaderComponent={
                    <View style={styles.statsContainer}>
                        <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="wallet-outline" size={24} color={theme.primary} />
                            <Text style={[styles.statValue, { color: theme.text }]}>{totalEarnings} ₴</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                {locale === 'en' ? 'Total Earnings' : 'Загальний заробіток'}
                            </Text>
                        </View>
                        <View style={[styles.statBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
                            <Ionicons name="checkmark-done-circle-outline" size={24} color="#2ecc71" />
                            <Text style={[styles.statValue, { color: theme.text }]}>{completedOrders.length}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                {locale === 'en' ? 'Deliveries' : 'Доставок'}
                            </Text>
                        </View>
                    </View>
                }
                renderItem={renderHistoryItem}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="receipt-outline" size={48} color={theme.textSecondary} style={{ opacity: 0.5 }} />
                        <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                            {locale === 'en' ? 'No completed orders yet' : 'Виконані замовлення відсутні'}
                        </Text>
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
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 20, 
        paddingTop: 10, 
        paddingBottom: 20 
    },
    headerTitle: { 
        fontSize: 20, 
        fontWeight: 'bold', 
    },
    list: { paddingBottom: 50 },
    statsContainer: { 
        flexDirection: 'row', 
        paddingHorizontal: 20, 
        gap: 15, 
        marginBottom: 24,
        marginTop: 10
    },
    statBox: { 
        flex: 1, 
        padding: 16, 
        borderRadius: 24, 
        borderWidth: StyleSheet.hairlineWidth,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 1 }
        })
    },
    statLabel: { 
        fontSize: 12, 
        marginTop: 10, 
        fontWeight: '600',
    },
    statValue: { 
        fontSize: 22, 
        fontWeight: '900',
        marginTop: 4
    },
    emptyContainer: { alignItems: 'center', justifyContent: 'center', marginTop: 100 },
    emptyText: {
        marginTop: 15,
        fontSize: 15,
        fontWeight: '600',
    },

    // Card styles aligned 1:1 with orders.js
    card: { 
        borderRadius: 24, 
        marginHorizontal: 20,
        marginBottom: 12, 
        borderWidth: StyleSheet.hairlineWidth, 
        padding: 18, 
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 2 }
        })
    },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    row: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 10 },
    iconBox: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    orderTitle: { fontSize: 16, fontWeight: '900' },
    date: { fontSize: 13, color: 'gray', marginTop: 4, fontWeight: '600' },
    price: { fontSize: 18, fontWeight: '900' },
});
