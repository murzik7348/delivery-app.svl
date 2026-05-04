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
    Platform,
    ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../constants/Colors';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import {
    courierAcceptOrderThunk,
    courierPickupOrderThunk,
    courierConfirmOrderThunk,
    fetchCourierOrders,
    updateActiveOrderStatus,
    completeActiveOrder,
} from '../store/courierSlice';
import { t } from '../constants/translations';
import { useSelector } from 'react-redux';
import { formatOrderNumber } from '../utils/formatOrderNumber';
import SwipeButton from './SwipeButton';

export default function CourierOrderSheet({ visible, onClose, order }) {
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const dispatch = useDispatch();
    const locale = useSelector((state) => state.language?.locale ?? 'uk');
    const user = useSelector((state) => state.auth.user);
    
    // Get live order data from store to stay synced
    const activeOrders = useSelector((state) => state.courier.activeOrders || []);
    const availableOrders = useSelector((state) => state.courier.availableOrders || []);
    const completedOrders = useSelector((state) => state.courier.completedOrders || []);
    
    const liveOrder = [...activeOrders, ...availableOrders, ...completedOrders].find(o => o.id === order?.id) || order;

    // Local states
    const [deliveryPhoto, setDeliveryPhoto] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!liveOrder) return null;

    const pickImage = async () => {
        try {
            // Request camera permissions first
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    locale === 'en' ? 'Permission Needed' : 'Потрібен дозвіл',
                    locale === 'en' ? 'We need camera access to take a photo of the delivery.' : 'Нам потрібен доступ до камери, щоб зробити фото доставки.'
                );
                return;
            }

            let result = await ImagePicker.launchCameraAsync({
                mediaTypes: ['images'], // Updated from deprecated MediaTypeOptions
                allowsEditing: true,
                aspect: [4, 3],
                quality: 0.7,
            });

            if (!result.canceled) {
                setDeliveryPhoto(result.assets[0].uri);
            }
        } catch (error) {
            console.error('Camera Error:', error);
            Alert.alert(locale === 'en' ? 'Camera Error' : 'Помилка камери', error.message);
        }
    };

    const handleAcceptOrder = async () => {
        setIsSubmitting(true);
        try {
            const resultAction = await dispatch(courierAcceptOrderThunk(liveOrder.id));
            setIsSubmitting(false);
            if (courierAcceptOrderThunk.fulfilled.match(resultAction)) {
                onClose();
                Alert.alert(
                    locale === 'en' ? 'Accepted!' : 'Прийнято!',
                    locale === 'en' ? 'Order is now assigned to you.' : 'Замовлення тепер закріплене за вами.'
                );
            } else {
                const error = resultAction.payload;
                const errorStr = String(error || '');
                Alert.alert(locale === 'en' ? 'Error' : 'Помилка', errorStr || (locale === 'en' ? 'Failed to accept order' : 'Не вдалося прийняти замовлення'));
            }
            dispatch(fetchCourierOrders());
        } catch (e) {
            setIsSubmitting(false);
            Alert.alert(locale === 'en' ? 'Error' : 'Помилка', e.message);
        }
    };

    const handleNextStage = (nextStatus) => {
        dispatch(updateActiveOrderStatus(nextStatus));
    };

    const handleConfirmDelivery = async () => {
        // Photo is currently optional since backend doesn't support upload yet
        
        console.log(`[CourierAction] Attempting Delivery Confirm for order ${liveOrder.id}`);
        setIsSubmitting(true);
        const resultAction = await dispatch(courierConfirmOrderThunk(liveOrder.id));
        setIsSubmitting(false);

        if (courierConfirmOrderThunk.fulfilled.match(resultAction)) {
            console.log(`[CourierAction] Delivery Confirm SUCCESS for order ${liveOrder.id}`);
            Alert.alert(
                locale === 'en' ? 'Delivered!' : 'Доставлено!',
                locale === 'en' ? 'Order completed successfully.' : 'Замовлення успішно завершено.'
            );
            onClose();
        } else {
            const errorPayload = resultAction.payload;
            const errorMsg = String(typeof errorPayload === 'object' ? errorPayload?.message || errorPayload?.code : errorPayload || '');
            
            console.error(`[CourierAction] Delivery Confirm ERROR for order ${liveOrder.id}: ${errorMsg}`);
            Alert.alert(
                locale === 'en' ? 'Error' : 'Помилка', 
                errorMsg || (locale === 'en' ? 'Failed to confirm delivery' : 'Не вдалося підтвердити доставку')
            );
        }
        dispatch(fetchCourierOrders());
    };

    const getReadyByTime = () => {
        if (!liveOrder.createdAt || !liveOrder.cookingTimeMinutes) return null;
        try {
            const createdDate = new Date(liveOrder.createdAt);
            if (isNaN(createdDate.getTime())) return null;
            const readyByDate = new Date(createdDate.getTime() + liveOrder.cookingTimeMinutes * 60000);
            return readyByDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return null;
        }
    };

    const renderWorkflowButtons = () => {
        // Statuses from courierSlice: created, accepted, paid, preparing, ready_for_pickup, delivering, completed, canceled
        switch (liveOrder.status) {
            case 'created':
            case 'pending':
            case 'preparing':
            case 'accepted':
                // Check if this courier is already assigned
                if (!liveOrder.isBooked) {
                    return (
                        <SwipeButton 
                            title={locale === 'en' ? 'Swipe to Accept' : 'Свайпніть, щоб прийняти'} 
                            onSwipeSuccess={handleAcceptOrder} 
                            isLoading={isSubmitting} 
                            isDark={isDark} 
                            color="#e334e3" 
                            icon="chevron-forward"
                        />
                    );
                }
                
                const currentUserId = user?.userId || user?.id;
                if (Number(liveOrder.courierId) !== Number(currentUserId)) {
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
                    <View style={[styles.infoBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                        <Ionicons name="time-outline" size={24} color="#e67e22" />
                        <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 10 }}>
                            {locale === 'en' ? 'Wait for pickup' : 'Очікуйте на видачу'}
                        </Text>
                    </View>
                );
            case 'ready_for_pickup':
                if (!liveOrder.isBooked) {
                   return (
                        <SwipeButton 
                            title={locale === 'en' ? 'Swipe to Accept & Pick Up' : 'Свайпніть, щоб прийняти і забрати'} 
                            onSwipeSuccess={handleAcceptOrder} 
                            isLoading={isSubmitting} 
                            isDark={isDark} 
                            color="#e334e3" 
                            icon="chevron-forward"
                        />
                    );
                }

                const currentUserIdReady = user?.userId || user?.id;
                if (Number(liveOrder.courierId) !== Number(currentUserIdReady)) {
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
                    <SwipeButton 
                        title={locale === 'en' ? 'Swipe to Pick Up' : 'Свайпніть, щоб забрати'} 
                        onSwipeSuccess={async () => {
                            console.log(`[CourierAction] Attempting Pickup for order ${liveOrder.id}`);
                            setIsSubmitting(true);
                            const result = await dispatch(courierPickupOrderThunk(liveOrder.id));
                            setIsSubmitting(false);
                            
                            if (courierPickupOrderThunk.fulfilled.match(result)) {
                                console.log(`[CourierAction] Pickup SUCCESS for order ${liveOrder.id}`);
                                Alert.alert(
                                    locale === 'en' ? 'Picked Up!' : 'Забрано!',
                                    locale === 'en' ? 'Deliver to the client.' : 'Прямуйте до клієнта.'
                                );
                                dispatch(fetchCourierOrders());
                            } else if (courierPickupOrderThunk.rejected.match(result)) {
                                const errorMsg = String(result.payload || '');
                                if (
                                    errorMsg.includes('ALREADY_PICKED_UP') || 
                                    errorMsg.includes('DELIVERY_STATUS_NOT_CHANGED') ||
                                    errorMsg.includes('cannot be picked up')
                                ) {
                                    console.log(`[CourierAction] Pseudo-SUCCESS (Already picked up) for order ${liveOrder.id}`);
                                    Alert.alert(
                                        locale === 'en' ? 'Picked Up!' : 'Забрано!',
                                        locale === 'en' ? 'Deliver to the client.' : 'Прямуйте до клієнта.'
                                    );
                                    dispatch(fetchCourierOrders());
                                } else {
                                    console.error(`[CourierAction] Pickup ERROR for order ${liveOrder.id}: ${errorMsg}`);
                                    Alert.alert(
                                        locale === 'en' ? 'Pickup Failed' : 'Помилка видачі',
                                        errorMsg || (locale === 'en' ? 'Server error during pickup.' : 'Помилка сервера під час видачі.')
                                    );
                                }
                            }
                        }} 
                        isLoading={isSubmitting} 
                        isDark={isDark} 
                        color="#3498db" 
                        icon="cube-outline"
                    />
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

                        <View style={{ opacity: 1 }}>
                            <SwipeButton 
                                title={locale === 'en' ? 'Swipe to Deliver' : 'Свайпніть, щоб віддати'} 
                                onSwipeSuccess={handleConfirmDelivery} 
                                isLoading={isSubmitting} 
                                isDark={isDark} 
                                color="#2ecc71" 
                                icon="home-outline"
                            />
                        </View>
                    </View>
                );
            default:
                // Show nothing if order is completed, canceled or in an unknown state
                if (liveOrder.status === 'completed') {
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
                <BlurView
                    intensity={isDark ? 40 : 80}
                    tint={isDark ? 'dark' : 'light'}
                    style={[styles.sheet, { backgroundColor: isDark ? 'rgba(30,30,30,0.7)' : 'rgba(255,255,255,0.8)', borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)', borderWidth: 1 }]}
                >
                    <View style={[styles.pill, { backgroundColor: isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)' }]} />
                    
                    <View style={styles.header}>
                        <View>
                            <Text style={[styles.title, { color: theme.text }]}>
                                {locale === 'en' ? 'Order' : 'Замовлення'} {formatOrderNumber(liveOrder.id)}
                            </Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                                {(() => {
                                    const currentUserId = user?.userId || user?.id;
                                    const isMine = Number(liveOrder.courierId) === Number(currentUserId);
                                    const isBookedByOther = liveOrder.isBooked && !isMine;
                                    
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
                            <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="wallet-outline" size={24} color="#2ecc71" />
                                <Text style={[styles.statValue, { color: theme.text }]}>{liveOrder.earnings} ₴</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {locale === 'en' ? 'Earnings' : 'Заробіток'}
                                </Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="time-outline" size={24} color="#3498db" />
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {getReadyByTime() || (liveOrder.cookingTimeMinutes ? `${liveOrder.cookingTimeMinutes}m` : '—')}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {getReadyByTime() ? (locale === 'en' ? 'Ready by' : 'Готово до') : (locale === 'en' ? 'Cooking' : 'Готується')}
                                </Text>
                            </View>
                            <View style={[styles.statBox, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                                <Ionicons name="barbell-outline" size={24} color="#e67e22" />
                                <Text style={[styles.statValue, { color: theme.text }]}>{liveOrder.weight} kg</Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>
                                    {locale === 'en' ? 'Weight' : 'Вага'}
                                </Text>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text }]}>
                            {locale === 'en' ? 'Customer' : 'Клієнт'}
                        </Text>
                        <View style={[styles.navContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)', marginBottom: 20 }]}>
                            <View style={styles.navRow}>
                                <Ionicons name="person-outline" size={20} color="#3498db" style={styles.navIcon} />
                                <View style={styles.navTextContainer}>
                                    <Text style={[styles.navPrimaryText, { color: theme.text }]}>
                                        {liveOrder.customerName}
                                    </Text>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.navSecondaryText, { color: theme.textSecondary }]}>
                                            {liveOrder.status === 'delivering' ? liveOrder.customerPhone : '****'}
                                        </Text>
                                        {liveOrder.status === 'delivering' && (
                                            <TouchableOpacity
                                                style={styles.callBtn}
                                                onPress={() => {
                                                    const phone = liveOrder.customerPhone?.replace(/[^+\d]/g, '');
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
                        <View style={[styles.navContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            <View style={styles.navRow}>
                                <Ionicons name="restaurant-outline" size={20} color="#e334e3" style={styles.navIcon} />
                                <View style={styles.navTextContainer}>
                                    <View style={styles.rowBetween}>
                                        <Text style={[styles.navPrimaryText, { color: theme.text }]}>
                                            {locale === 'en' ? 'To Shop' : 'В заклад'}
                                        </Text>
                                        <Text style={[styles.navSecondaryText, { color: theme.textSecondary }]}>
                                            {liveOrder.navigationStats.toShopDistance || liveOrder.totalDistance}
                                        </Text>
                                    </View>
                                    <Text style={[styles.restaurantNameSmall, { color: theme.textSecondary }]} numberOfLines={1}>
                                        {liveOrder.restaurantName}
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
                                            {liveOrder.navigationStats.toClientDistance || '—'}
                                        </Text>
                                    </View>
                                    <Text style={[styles.navSecondaryText, { color: theme.textPrimary, fontWeight: 'bold' }]} numberOfLines={2}>
                                        { (Number(liveOrder.courierId) === Number(user?.userId || user?.id)) ? liveOrder.address : (locale === 'en' ? 'Address hidden (Book first)' : 'Адреса прихована (Забронюйте)') }
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>
                            {locale === 'en' ? 'Order Contents' : 'Вміст замовлення'} - {liveOrder.restaurantName}
                        </Text>
                        <View style={[styles.itemsContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)' }]}>
                            {liveOrder.items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
                                    <Text style={[styles.itemQty, { color: theme.textSecondary }]}>x{item.quantity}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    {/* Fixed Sticky Footer for Actions */}
                    <View style={[styles.fixedFooter, { 
                        backgroundColor: 'transparent', 
                        borderTopColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)',
                        paddingBottom: Math.max(insets.bottom, 20) 
                    }]}>
                        {(!liveOrder.address || liveOrder.address === 'Address N/A') && (
                            <View style={styles.warningBox}>
                                <Ionicons name="warning-outline" size={16} color="#e67e22" />
                                <Text style={styles.warningText}>
                                    {locale === 'en' ? 'Address missing in API' : 'Адреса відсутня в API (Бекенд)'}
                                </Text>
                            </View>
                        )}
                        {renderWorkflowButtons()}
                    </View>
                </BlurView>
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
