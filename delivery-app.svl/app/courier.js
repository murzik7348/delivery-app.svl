import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, useColorScheme, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import Colors from '../constants/Colors';
import CourierOrdersPanel from '../components/CourierOrdersPanel';
import BackButton from '../components/BackButton';

const { width } = Dimensions.get('window');

export default function CourierDeliveryScreen() {
    const router = useRouter();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const isDark = colorScheme === 'dark';
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const { user, isAuthenticated } = useSelector((state) => state.auth);

    // Guard: Role Check
    const userRole = user?.role?.toLowerCase();
    const isCourier = userRole === 'courier' || userRole === 'курєр' || Number(user?.role) === 1;

    if (!isAuthenticated || !isCourier) {
        return (
            <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f8f9fa' }]}>
                {/* Background Decoration */}
                <View style={[styles.circle, { top: -100, right: -50, backgroundColor: '#e334e320' }]} />
                <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: '#34e3e320', width: 250, height: 250 }]} />
                
                <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.errorCard}>
                        <Ionicons name="lock-closed" size={60} color="#e74c3c" style={{ marginBottom: 20 }} />
                        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800', marginBottom: 10, textAlign: 'center' }}>
                            {locale === 'en' ? 'Access Denied' : 'Доступ заборонено'}
                        </Text>
                        <Text style={{ color: theme.textSecondary, fontSize: 14, marginBottom: 20, textAlign: 'center' }}>
                            {locale === 'en' ? 'Only couriers can view this page.' : 'Ця сторінка доступна лише кур\'єрам.'}
                        </Text>
                        <TouchableOpacity
                            style={styles.primaryBtn}
                            activeOpacity={0.8}
                            onPress={() => router.replace('/')}
                        >
                            <Text style={styles.btnText}>{locale === 'en' ? 'Go to Home' : 'На головну'}</Text>
                        </TouchableOpacity>
                    </BlurView>
                </SafeAreaView>
            </View>
        );
    }

    return (
        <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f8f9fa' }]}>
            {/* Background Decoration */}
            <View style={[styles.circle, { top: -100, right: -50, backgroundColor: '#e334e320' }]} />
            <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: '#34e3e320', width: 250, height: 250 }]} />

            <SafeAreaView edges={['top']} style={{ flex: 1 }}>
                <View style={styles.header}>
                    <BackButton color={theme.text} />
                    <Text style={[styles.headerTitle, { color: theme.text }]}>
                        {locale === 'en' ? 'Courier Panel' : 'Панель кур\'єра'}
                    </Text>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
                    <CourierOrdersPanel />
                </ScrollView>
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
    header: { 
        flexDirection: 'row', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        paddingHorizontal: 16, 
        paddingVertical: 12,
        zIndex: 10,
    },
    headerTitle: { fontSize: 22, fontWeight: '800' },
    errorCard: {
        width: width * 0.85,
        padding: 30,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
        overflow: 'hidden'
    },
    primaryBtn: {
        backgroundColor: '#e334e3',
        paddingVertical: 16,
        paddingHorizontal: 30,
        borderRadius: 20,
        width: '100%',
        alignItems: 'center',
        shadowColor: '#e334e3',
        shadowOpacity: 0.4,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 8 },
        elevation: 8,
    },
    btnText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    }
});
