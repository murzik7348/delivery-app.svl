import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    useColorScheme,
    ScrollView,
    Image,
    Alert,
    Linking,
    TouchableWithoutFeedback,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import {
    courierAcceptOrderThunk,
    courierPickupOrderThunk,
    courierConfirmOrderThunk,
    fetchCourierOrders,
    updateActiveOrderStatus,
} from '../store/courierSlice';
import { t } from '../constants/translations';
import { useSelector } from 'react-redux';
import { formatOrderNumber } from '../utils/formatOrderNumber';

export default function CourierOrderSheet({ visible, onClose, order }) {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const user = useSelector((state) => state.auth.user);
    
    // Photo state for delivery confirmation
    const [deliveryPhoto, setDeliveryPhoto] = useState(null);

    if (!order) return null;

    const pickImage = async () => {
        let result = await ImagePicker.launchCameraAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [4, 3],
            quality: 0.7,
        });

        if (!result.canceled) {
            setDeliveryPhoto(result.assets[0].uri);
        }
    };

    const handleAcceptOrder = async () => {
        try {
            const resultAction = await dispatch(courierAcceptOrderThunk(order.id));
            if (courierAcceptOrderThunk.fulfilled.match(resultAction)) {
                onClose();
                Alert.alert(
                    locale === 'en' ? 'Accepted!' : 'Прийнято!',
                    locale === 'en' ? 'Order is now assigned to you.' : 'Замовлення тепер закріплене за вами.'
                );
                // Wait slightly before refetching to allow backend to update its indices
                // This prevents the order from 'disappearing' for a second during the sync
                setTimeout(() => {
                    dispatch(fetchCourierOrders());
                }, 1500);
            } else {
                const error = resultAction.payload;
                const isAlreadyTaken = error === 'Delivery already taken' || (typeof error === 'string' && error.includes('ALREADY_TAKEN'));
                
                if (isAlreadyTaken) {
                    Alert.alert(
                        locale === 'en' ? 'Order Already Taken' : 'Замовлення вже зайняте',
                        locale === 'en' ? 'Sorry, another courier has already accepted this order.' : 'Вибачте, інший кур\'єр вже прийняв це замовлення.'
                    );
                    onClose();
                    dispatch(fetchCourierOrders());
                } else {
                    Alert.alert(locale === 'en' ? 'Error' : 'Помилка', error || (locale === 'en' ? 'Failed to accept order' : 'Не вдалося прийняти замовлення'));
                    dispatch(fetchCourierOrders());
                }
            }
        } catch (e) {
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', e.message);
        }
    };

    const handleNextStage = (nextStatus) => {
        dispatch(updateActiveOrderStatus(nextStatus));
    };

    const handleConfirmDelivery = () => {
        if (!deliveryPhoto) {
            Alert.alert(
                locale === 'en' ? 'Photo Required' : 'Потрібне фото',
                locale === 'en' ? 'Please take a photo of the delivered order to confirm.' : 'Будь ласка, зробіть фото доставленого замовлення для підтвердження.'
            );
            return;
        }
        dispatch(courierConfirmOrderThunk(order.id));
        onClose();
    };

    const getReadyByTime = () => {
        if (!order.createdAt || !order.cookingTimeMinutes) return null;
        try {
            const createdDate = new Date(order.createdAt);
            if (isNaN(createdDate.getTime())) return null;
            const readyByDate = new Date(createdDate.getTime() + order.cookingTimeMinutes * 60000);
            return readyByDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return null;
        }
    };

    const renderWorkflowButtons = () => {
        // Statuses from courierSlice: created, accepted, paid, preparing, ready_for_pickup, delivering, completed, canceled
        switch (order.status) {
            case 'created':
            case 'pending':
            case 'paid':
            case 'preparing':
            case 'accepted':
                // Check if this courier is already assigned
                if (!order.isBooked) {
                    return (
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleAcceptOrder}>
                            <Text style={styles.btnText}>
                                {locale === 'en' ? 'Accept Order' : 'Прийняти замовлення'}
                            </Text>
                        </TouchableOpacity>
                    );
                }
                
                const currentUserId = user?.userId || user?.id;
                if (Number(order.courierId) !== Number(currentUserId)) {
                    return (
                        <View style={[styles.primaryBtn, { backgroundColor: '#e74c3c', opacity: 0.8, flexDirection: 'row' }]}>
                            <Ionicons name="lock-closed" size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.btnText}>
                                {locale === 'en' ? 'Booked' : 'Заброньовано'}
                            </Text>
                        </View>
                    );
                }
                
                // If already booked/assigned but not delivering yet
                return (
                    <View style={[styles.infoBox, { backgroundColor: theme.input }]}>
                        <Ionicons name="time-outline" size={24} color="#e67e22" />
                        <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 10 }}>
                            {locale === 'en' ? 'Wait for pickup' : 'Очікуйте на видачу'}
                        </Text>
                    </View>
                );
            case 'ready_for_pickup':
                if (!order.isBooked) {
                   return (
                        <TouchableOpacity style={styles.primaryBtn} onPress={handleAcceptOrder}>
                            <Text style={styles.btnText}>
                                {locale === 'en' ? 'Accept & Pick Up' : 'Прийняти та забрати'}
                            </Text>
                        </TouchableOpacity>
                    );
                }

                const currentUserIdReady = user?.userId || user?.id;
                if (Number(order.courierId) !== Number(currentUserIdReady)) {
                    return (
                        <View style={[styles.primaryBtn, { backgroundColor: '#e74c3c', opacity: 0.8, flexDirection: 'row' }]}>
                            <Ionicons name="lock-closed" size={20} color="white" style={{ marginRight: 10 }} />
                            <Text style={styles.btnText}>
                                {locale === 'en' ? 'Booked' : 'Заброньовано'}
                            </Text>
                        </View>
                    );
                }
                return (
                    <TouchableOpacity
                        style={styles.primaryBtn}
                        onPress={() => {
                            dispatch(courierPickupOrderThunk(order.id));
                            handleNextStage('delivering');
                        }}
                    >
                        <Text style={styles.btnText}>
                            {locale === 'en' ? 'Pick Up from Restaurant' : 'Забрати з ресторану'}
                        </Text>
                    </TouchableOpacity>
                );
            case 'delivering':
                return (
                    <View style={styles.deliveryProofContainer}>
                        <TouchableOpacity onPress={pickImage} style={[styles.photoBtn, { borderColor: theme.border }]}>
                            {deliveryPhoto ? (
                                <Image source={{ uri: deliveryPhoto }} style={styles.deliveryImage} />
                            ) : (
                                <>
                                    <Ionicons name="camera" size={32} color="#e334e3" />
                                    <Text style={[styles.photoBtnText, { color: theme.text }]}>
                                        {locale === 'en' ? 'Take Photo at Door' : 'Зробити фото біля дверей'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>

                        <TouchableOpacity 
                            style={[styles.primaryBtn, { opacity: deliveryPhoto ? 1 : 0.5 }]} 
                            onPress={handleConfirmDelivery}
                            disabled={!deliveryPhoto}
                        >
                            <Text style={styles.btnText}>
                                {locale === 'en' ? 'Confirm Delivery' : 'Підтвердити доставку'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                );
            default:
                // Show nothing if order is completed, canceled or in an unknown state
                if (order.status === 'completed') {
                    return (
                        <View style={[styles.infoBox, { backgroundColor: '#2ecc7120' }]}>
                             <Ionicons name="checkmark-done-circle" size={24} color="#2ecc71" />
                             <Text style={{ color: '#2ecc71', fontWeight: 'bold', marginLeft: 10 }}>
                                 {locale === 'en' ? 'Delivery Completed' : 'Доставка завершена'}
                             </Text>
                        </View>
                    );
                }
                return null;
        }
    };

    return (
        <Modal
            animationType="slide"
            transparent
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.backdrop}>
                <TouchableOpacity
                    activeOpacity={1}
                    onPress={onClose}
                    style={StyleSheet.absoluteFill}
                />
                <View
                    style={[styles.sheet, { backgroundColor: theme.card }]}
                >
                    <View style={styles.pill} />
                    
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: theme.text }]}>
                                {locale === 'en' ? 'Order' : 'Замовлення'} {formatOrderNumber(order.id)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                {(() => {
                                    const currentUserId = user?.userId || user?.id;
                                    const isMine = Number(order.courierId) === Number(currentUserId);
                                    const isBookedByOther = order.isBooked && !isMine;
                                    
                                    if (isBookedByOther) {
                                        return (
                                            <View style={[styles.statusBadgeSmall, { backgroundColor: '#e74c3c20', borderColor: '#e74c3c', borderWidth: 1 }]}>
                                                <Ionicons name="lock-closed" size={10} color="#e74c3c" />
                                                <Text style={{ color: '#e74c3c', fontSize: 10, fontWeight: 'bold', marginLeft: 4, textTransform: 'uppercase' }}>
                                                    {locale === 'en' ? 'Booked by other' : 'Заброньовано іншим'}
                                                </Text>
                                            </View>
                                        );
                                    }
                                    
                                    if (isMine) {
                                        return (
                                            <View style={[styles.statusBadgeSmall, { backgroundColor: '#2ecc7120', borderColor: '#2ecc71', borderWidth: 1 }]}>
                                                <Ionicons name="person" size={10} color="#2ecc71" />
                                                <Text style={{ color: '#2ecc71', fontSize: 10, fontWeight: 'bold', marginLeft: 4, textTransform: 'uppercase' }}>
                                                    {locale === 'en' ? 'Your Order' : 'Ваше замовлення'}
                                                </Text>
                                            </View>
                                        );
                                    }

                                    return (
                                        <View style={[styles.statusBadgeSmall, { backgroundColor: '#3498db20', borderColor: '#3498db', borderWidth: 1 }]}>
                                            <Ionicons name="lock-open-outline" size={10} color="#3498db" />
                                            <Text style={{ color: '#3498db', fontSize: 10, fontWeight: 'bold', marginLeft: 4, textTransform: 'uppercase' }}>
                                                {locale === 'en' ? 'Free' : 'Вільне'}
                                            </Text>
                                        </View>
                                    );
                                })()}
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close-circle-outline" size={28} color={theme.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView 
                        showsVerticalScrollIndicator={false} 
                        style={{ flex: 1 }}
                        contentContainerStyle={{ paddingBottom: 250 }}
                    >
                        <View style={styles.statsRow}>
                            <View style={[styles.statBox, { backgroundColor: theme.input }]}>
                                <Ionicons name="wallet-outline" size={24} color="#2ecc71" />
                                <Text style={[styles.statValue, { color: theme.text }]}>{order.earnings} ₴</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {locale === 'en' ? 'Earnings' : 'Заробіток'}
                                </Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: theme.input }]}>
                                <Ionicons name="time-outline" size={24} color="#3498db" />
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {getReadyByTime() || (order.cookingTimeMinutes ? `${order.cookingTimeMinutes}m` : '—')}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {getReadyByTime() ? (locale === 'en' ? 'Ready by' : 'Готово до') : (locale === 'en' ? 'Cooking' : 'Готується')}
                                </Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: theme.input }]}>
                                <Ionicons name="barbell-outline" size={24} color="#e67e22" />
                                <Text style={[styles.statValue, { color: theme.text }]}>{order.weight} kg</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {locale === 'en' ? 'Weight' : 'Вага'}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Customer' : 'Клієнт'}
                        </Text>
                        <View style={[styles.navContainer, { backgroundColor: theme.input, marginBottom: 20 }]}>
                            <View style={styles.navRow}>
                                <Ionicons name="person-outline" size={20} color="#3498db" style={styles.navIcon} />
                                <View style={styles.navTextContainer}>
                                    <Text style={[styles.navPrimaryText, { color: theme.text }]}>
                                        {order.customerName}
                                    </Text>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.navSecondaryText, { color: theme.textSecondary }]}>
                                            {order.status === 'delivering' ? order.customerPhone : '****'}
                                        </Text>
                                        {order.status === 'delivering' && (
                                            <TouchableOpacity
                                                style={styles.callBtn}
                                                onPress={() => {
                                                    const phone = order.customerPhone?.replace(/[^+\d]/g, '');
                                                    if (phone && phone.length >= 7) {
                                                        Linking.openURL(`tel:${phone}`);
                                                    } else {
                                                        Alert.alert(
                                                            locale === 'en' ? 'No phone' : 'Немає номера',
                                                            locale === 'en' ? 'Phone number unavailable' : 'Номер телефону недоступний'
                                                        );
                                                    }
                                                }}
                                            >
                                                <Ionicons name="call" size={14} color="white" />
                                                <Text style={styles.callBtnText}>{locale === 'en' ? 'Call' : 'Виклик'}</Text>
                                            </TouchableOpacity>
                                        )}
                                    </View>
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Locations' : 'Локації'}
                        </Text>
                        <View style={[styles.navContainer, { backgroundColor: theme.input }]}>
                            <View style={styles.navRow}>
                                <Ionicons name="restaurant-outline" size={20} color="#e334e3" style={styles.navIcon} />
                                <View style={styles.navTextContainer}>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.navPrimaryText, { color: theme.text }]}>
                                            {locale === 'en' ? 'To Shop' : 'В заклад'}
                                        </Text>
                                        <Text style={[styles.navSecondaryText, { color: theme.textSecondary }]}>
                                            {order.navigationStats.toShopDistance || order.totalDistance}
                                        </Text>
                                    </View>
                                    <Text style={[styles.restaurantNameSmall, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {order.restaurantName}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.verticalDivider} />
                            <View style={styles.navRow}>
                                <Ionicons name="home-outline" size={20} color="#3498db" style={styles.navIcon} />
                                <View style={styles.navTextContainer}>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.navPrimaryText, { color: theme.text }]}>
                                            {locale === 'en' ? 'To Client' : 'До клієнта'}
                                        </Text>
                                        <Text style={[styles.navSecondaryText, { color: theme.textSecondary }]}>
                                            {order.navigationStats.toClientDistance || '—'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.navSecondaryText, { color: theme.textPrimary, fontWeight: 'bold' }]} numberOfLines={2}>
                                        { (Number(order.courierId) === Number(user?.userId || user?.id)) ? order.address : (locale === 'en' ? 'Address hidden (Book first)' : 'Адреса прихована (Забронюйте)') }
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                            {locale === 'en' ? 'Order Contents' : 'Вміст замовлення'} - {order.restaurantName}
                        </Text>
                        <View style={[styles.itemsContainer, { backgroundColor: theme.input }]}>
                            {order.items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                                    <Text style={[styles.itemQty, { color: theme.textSecondary }]}>x{item.quantity}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Fixed Sticky Footer for Actions */}
                    <View style={[styles.fixedFooter, { 
                        backgroundColor: theme.card, 
                        borderTopColor: theme.border,
                        paddingBottom: Math.max(insets.bottom, 20) 
                    }]}>
                        {(!order.address || order.address === 'Address N/A') && (
                            <View style={styles.warningBox}>
                                <Ionicons name="warning-outline" size={16} color="#e67e22" />
                                <Text style={styles.warningText}>
                                    {locale === 'en' ? 'Address missing in API' : 'Адреса відсутня в API (Бекенд)'}
                                </Text>
                            </View>
                        )}
                        {renderWorkflowButtons()}
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    sheet: {
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 12,
        height: '75%',
    },
    pill: {
        width: 44,
        height: 5,
        backgroundColor: '#C6C6CC',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        borderRadius: 16,
        padding: 16,
        alignItems: 'center',
        marginHorizontal: 5,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 8,
    },
    statLabel: {
        fontSize: 12,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    navContainer: {
        borderRadius: 16,
        padding: 16,
    },
    navRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rowBetween: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    restaurantNameSmall: {
        fontSize: 14,
        marginTop: 2,
    },
    callBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#3498db',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    callBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    navIcon: {
        marginRight: 16,
    },
    navTextContainer: {
        flex: 1,
    },
    navPrimaryText: {
        fontSize: 16,
        fontWeight: '600',
    },
    navSecondaryText: {
        fontSize: 14,
        marginTop: 2,
    },
    verticalDivider: {
        height: 20,
        width: 2,
        backgroundColor: '#e0e0e0',
        marginLeft: 9, // aligns with icon center
        marginVertical: 4,
    },
    itemsContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
    },
    itemRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    itemName: {
        fontSize: 15,
        flex: 1,
    },
    itemQty: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    fixedFooter: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 12,
        borderTopWidth: 1,
    },
    primaryBtn: {
        backgroundColor: '#e334e3',
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginVertical: 8,
    },
    btnText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    deliveryProofContainer: {
        marginTop: 10,
    },
    photoBtn: {
        borderWidth: 2,
        borderStyle: 'dashed',
        borderRadius: 16,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        overflow: 'hidden',
    },
    photoBtnText: {
        marginTop: 10,
        fontSize: 16,
        fontWeight: '500',
    },
    deliveryImage: {
        width: '100%',
        height: '100%',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fdf2e9',
        padding: 8,
        borderRadius: 8,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#fad7a0',
    },
    warningText: {
        fontSize: 12,
        color: '#e67e22',
        marginLeft: 6,
        fontWeight: 'bold',
    },
    infoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        justifyContent: 'center',
    },
    statusBadgeSmall: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    }
});
