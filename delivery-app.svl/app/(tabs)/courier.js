import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../../constants/Colors';
import CourierOrdersPanel from '../../components/CourierOrdersPanel';

export default function CourierDeliveryScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    // Guard: Role Check
    const userRole = user?.role?.toLowerCase();
    const isCourier = userRole === 'courier' || userRole === 'курєр' || Number(user?.role) === 1;

    if (!isAuthenticated || !isCourier) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="lock-closed" size={60} color="red" style={{ marginBottom: 20 }} />
                <Text style={{ color: theme.text, fontSize: 22, fontWeight: 'bold', marginBottom: 10 }}>Доступ заборонено</Text>
                <TouchableOpacity
                    style={{ backgroundColor: '#e334e3', padding: 16, borderRadius: 12 }}
                    onPress={() => router.replace('/')}
                >
                    <Text style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>На головну</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={styles.header}>
                <View style={{ width: 28 }} />
                <Text style={[styles.headerTitle, { color: theme.text }]}>
                    {locale === 'en' ? 'Courier Delivery' : 'Доставка кур\'єром'}
                </Text>
                <View style={{ width: 28 }} />
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
                <CourierOrdersPanel />
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingVertical: 12 
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    backBtn: { padding: 4 },
});
