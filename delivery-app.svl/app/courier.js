import React from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import CourierOrdersPanel from '../components/CourierOrdersPanel';
import BackButton from '../components/BackButton';

export default function CourierDeliveryScreen() {
    const router      = useRouter();
    const colorScheme = useColorScheme();
    const theme       = Colors[colorScheme ?? 'light'];
    const locale      = useSelector((s) => s.language?.locale ?? 'uk');
    const { user, isAuthenticated } = useSelector((s) => s.auth);

    const userRole = user?.role?.toLowerCase();
    const isCourier =
        userRole === 'courier' || userRole === 'курєр' || Number(user?.role) === 1;

    if (!isAuthenticated || !isCourier) {
        return (
            <View style={[s.container, { backgroundColor: theme.background }]}>
                <SafeAreaView style={s.centered}>
                    <View style={[s.accessCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={[s.iconCircle, { backgroundColor: `${theme.primary}15` }]}>
                            <Ionicons name="shield-outline" size={34} color={theme.primary} />
                        </View>
                        <Text style={[s.accessTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Access Restricted' : 'Доступ обмежено'}
                        </Text>
                        <Text style={[s.accessSub, { color: theme.textSecondary }]}>
                            {locale === 'en'
                                ? 'Only verified couriers can access this panel.'
                                : 'Лише авторизовані кур\'єри мають доступ до цієї панелі.'}
                        </Text>
                        <TouchableOpacity
                            style={[s.btn, { backgroundColor: theme.primary }]}
                            onPress={() => router.replace('/')}
                            activeOpacity={0.85}
                        >
                            <Text style={s.btnText}>
                                {locale === 'en' ? 'Back to Home' : 'На головну'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <SafeAreaView edges={['top']} style={[s.container, { backgroundColor: theme.background }]}>
            {/* Шапка */}
            <View style={s.header}>
                <BackButton color={theme.text} />
                <Text style={[s.headerTitle, { color: theme.text }]}>
                    {locale === 'en' ? 'Courier Panel' : 'Панель кур\'єра'}
                </Text>
                <TouchableOpacity 
                    style={s.statsBtn} 
                    onPress={() => router.push('/courier-earnings')}
                    activeOpacity={0.7}
                >
                    <Ionicons name="calendar-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <View style={s.body}>
                <CourierOrdersPanel />
            </View>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    container: { flex: 1 },
    centered:   { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },

    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    headerTitle: { fontSize: 20, fontWeight: 'bold' },
    statsBtn: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    body: { flex: 1, paddingHorizontal: 16 },

    accessCard: {
        width: '100%', borderRadius: 24,
        padding: 28, alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
    },
    iconCircle: {
        width: 68, height: 68, borderRadius: 34,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 18,
    },
    accessTitle: { fontSize: 20, fontWeight: '800', marginBottom: 8, letterSpacing: -0.3 },
    accessSub:   { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24, fontWeight: '500' },
    btn: {
        alignSelf: 'stretch', height: 50, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center',
    },
    btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
