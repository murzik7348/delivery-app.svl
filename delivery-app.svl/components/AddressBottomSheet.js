import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    useColorScheme,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useRouter } from 'expo-router';
import Colors from '../constants/Colors';
import { setDeliveryType } from '../store/cartSlice';
import { setCurrentLocation } from '../store/locationSlice';

export default function AddressBottomSheet({ visible, onClose }) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const router = useRouter();
    const dispatch = useDispatch();
    const savedAddresses = useSelector((s) => s.auth?.addresses || []);

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.backdrop}
                activeOpacity={1}
                onPress={onClose}
            >
                <TouchableOpacity
                    activeOpacity={1}
                    style={[styles.sheet, { backgroundColor: theme.card }]}
                >
                    <View style={styles.pill} />
                    <Text style={[styles.title, { color: theme.text }]}>Адреса доставки</Text>

                    {savedAddresses && savedAddresses.length > 0 ? (
                        savedAddresses.map((addr, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.addressRow, { backgroundColor: theme.input }]}
                                onPress={() => {
                                    // When user picks an address, switch to delivery mode and set location
                                    dispatch(setDeliveryType('delivery'));
                                    dispatch(setCurrentLocation({
                                        latitude: addr.latitude,
                                        longitude: addr.longitude,
                                        addressName: addr.address,
                                    }));
                                    onClose();
                                }}
                            >
                                <Ionicons name="location-outline" size={20} color="#e334e3" />
                                <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={2}>
                                    {addr.address}
                                </Text>
                            </TouchableOpacity>
                        ))
                    ) : (
                        <Text style={[styles.noAddress, { color: 'gray' }]}>
                            Збережених адрес немає
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[styles.addBtn, { backgroundColor: '#e334e3', borderRadius: 12, padding: 12, justifyContent: 'center', marginTop: 15 }]}
                        onPress={() => {
                            onClose();
                            router.push('/location-picker');
                        }}
                    >
                        <Ionicons name="add-circle" size={22} color="white" />
                        <Text style={[styles.addBtnText, { color: 'white' }]}>Додати адресу</Text>
                    </TouchableOpacity>
                </TouchableOpacity>
            </TouchableOpacity>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingBottom: 40,
        paddingTop: 12,
    },
    pill: {
        width: 44,
        height: 5,
        backgroundColor: '#C6C6CC',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 16,
    },
    addressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 14,
        marginBottom: 10,
        gap: 10,
    },
    addressText: {
        flex: 1,
        fontSize: 15,
        fontWeight: '500',
    },
    noAddress: {
        fontSize: 15,
        marginBottom: 16,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginTop: 8,
    },
    addBtnText: {
        color: '#e334e3',
        fontSize: 15,
        fontWeight: '600',
    },
});