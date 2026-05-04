import React, { useMemo } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { BlurView } from 'expo-blur';
import { formatUkraineDate } from '../constants/dateUtils';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import { safeBack } from '../utils/navigation';
import BackButton from '../components/BackButton';

export default function CourierEarningsScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    
    // Using completedOrders from Redux courierSlice
    const completedOrders = useSelector((state) => state.courier.completedOrders || []);

    // Calculate total earnings and deliveries
    const totalEarnings = useMemo(() => {
        return completedOrders.reduce((sum, order) => sum + (Number(order.earnings) || 0), 0);
    }, [completedOrders]);

    const renderHistoryItem = ({ item }) => (
        <BlurView intensity={isDark ? 20 : 40} tint={isDark ? 'dark' : 'light'} style={[styles.historyCard, { borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]}>
            <View style={styles.cardHeader}>
                <View style={[styles.iconBox, { backgroundColor: '#2ecc7120' }]}>
                    <Ionicons name="checkmark-done-circle" size={24} color="#2ecc71" />
                </View>
                <View style={styles.cardInfo}>
                    <Text style={[styles.orderId, { color: theme.textSecondary }]}>{formatOrderNumber(item.id)}</Text>
                    <Text style={[styles.restaurantName, { color: theme.text }]} numberOfLines={1}>
                        {item.restaurantName}
                    </Text>
                    <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                        {formatUkraineDate(item.createdAt || new Date().toISOString())}
                    </Text>
                </View>
                <Text style={[styles.priceText, { color: theme.text }]}>+ {item.earnings} ₴</Text>
            </View>
        </BlurView>
    );

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f8f9fa' }]}>
            {/* Background Decoration */}
            <View style={[styles.circle, { top: -100, right: -50, backgroundColor: '#e334e320' }]} />
            <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: '#34e3e320', width: 250, height: 250 }]} />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <BackButton color={theme.text} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {locale === 'en' ? 'Earnings & History' : 'Заробіток та Історія'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.statsContainer}>
                    <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={[styles.statBox, { backgroundColor: isDark ? 'rgba(227, 52, 227, 0.2)' : '#e334e3' }]}>
                        <Ionicons name="wallet-outline" size={28} color="white" />
                        <Text style={styles.statLabel}>{locale === 'en' ? 'Total Earnings' : 'Загальний заробіток'}</Text>
                        <Text style={styles.statValue}>{totalEarnings} ₴</Text>
                    </BlurView>
                    <BlurView intensity={isDark ? 40 : 80} tint={isDark ? 'dark' : 'light'} style={[styles.statBox, { backgroundColor: isDark ? 'rgba(46, 204, 113, 0.2)' : '#2ecc71' }]}>
                        <Ionicons name="bicycle-outline" size={28} color="white" />
                        <Text style={styles.statLabel}>{locale === 'en' ? 'Deliveries' : 'Доставок'}</Text>
                        <Text style={styles.statValue}>{completedOrders.length}</Text>
                    </BlurView>
                </View>

                <Text style={[styles.sectionTitle, { color: theme.text }]}>
                    {locale === 'en' ? 'Completed Orders' : 'Виконані замовлення'}
                </Text>

                <FlatList
                    data={completedOrders}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 50 }}
                    renderItem={renderHistoryItem}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="document-text-outline" size={60} color="gray" style={{ opacity: 0.3 }} />
                            <Text style={{ color: theme.text, marginTop: 15, fontSize: 16 }}>
                                {locale === 'en' ? 'No history yet' : 'Історія порожня'}
                            </Text>
                        </View>
                    }
                />
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, overflow: 'hidden' },
    circle: {
        position: 'absolute',
        width: 300,
        height: 300,
        borderRadius: 150,
        zIndex: -1,
    },
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
    backBtn: { width: 34, height: 34, justifyContent: 'center', alignItems: 'flex-start' },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    
    statsContainer: { flexDirection: 'row', paddingHorizontal: 20, gap: 15, marginBottom: 30 },
    statBox: { flex: 1, padding: 20, borderRadius: 24, overflow: 'hidden' },
    statLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 12, marginBottom: 4, fontWeight: '600' },
    statValue: { color: 'white', fontSize: 24, fontWeight: '900' },

    sectionTitle: { fontSize: 20, fontWeight: '800', paddingHorizontal: 20, marginBottom: 16 },

    historyCard: { padding: 16, borderRadius: 20, marginBottom: 12, overflow: 'hidden' },
    cardHeader: { flexDirection: 'row', alignItems: 'center' },
    iconBox: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
    cardInfo: { flex: 1, marginLeft: 14 },
    orderId: { fontSize: 12, fontWeight: 'bold', marginBottom: 2 },
    restaurantName: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
    dateText: { fontSize: 12, fontWeight: '500' },
    priceText: { fontSize: 18, fontWeight: '900' },

    emptyContainer: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 },
});
