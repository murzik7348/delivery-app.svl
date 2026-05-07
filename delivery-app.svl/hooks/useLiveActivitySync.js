import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import * as LiveActivity from 'expo-live-activity';
import { Platform } from 'react-native';

/**
 * useLiveActivitySync automatically observes the Redux `ordersSlice`.
 * 
 * 1. Triggers IN-APP <DynamicIsland /> for immediate feedback.
 * 2. Manages REAL iOS Live Activities via expo-live-activity.
 */
export default function useLiveActivitySync() {
    const orders = useSelector(state => state.orders.orders);
    const locale = useSelector(state => state.language?.locale ?? 'uk');
    
    // Keep track of the currently synced order ID and status
    const activeOrderId = useRef(null);
    const activeOrderStatus = useRef(null);
    const activityId = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        // Find the most recent active order
        const activeOrder = orders.find(o => o.status !== 'completed' && o.status !== 'cancelled' && o.status !== 'delivered');

        if (activeOrder) {
            const isNewOrder = activeOrderId.current !== activeOrder.id;
            const isStatusChanged = activeOrderStatus.current !== activeOrder.status;

            if (isNewOrder || isStatusChanged) {
                const titles = {
                    accepted: `✅ ${locale === 'en' ? 'Accepted' : 'Прийнято'}`,
                    preparing: `🧑‍🍳 ${locale === 'en' ? 'Preparing' : 'Готується'}`,
                    ready: `🛍️ ${locale === 'en' ? 'Ready' : 'Готово'}`,
                    delivering: `🛵 ${locale === 'en' ? 'Delivering' : 'Доставка'}`
                };

                const messages = {
                    accepted: locale === 'en' ? 'Kitchen received your order' : 'Ресторан отримав замовлення',
                    preparing: locale === 'en' ? 'Chef is doing magic' : 'Шеф-кухар вже чаклує',
                    ready: locale === 'en' ? 'Your food is waiting for you' : 'Ваша їжа чекає на вас',
                    delivering: locale === 'en' ? 'Courier is rushing to you!' : 'Курʼєр вже поспішає до вас!'
                };

                const statusToStep = (status) => {
                    const s = String(status).toLowerCase();
                    // Mapping based on backEnd.json (0: Created, 1: Accepted, 2: Preparing, 3: Ready, 4: PickedUp, 5: Delivered)
                    if (s === 'delivered' || s === 'completed' || s === '5' || s === '6') return 5;
                    if (s === 'delivering' || s === 'picked_up' || s === '4') return 4;
                    if (s === 'ready_for_pickup' || s === 'ready' || s === '3') return 3;
                    if (s === 'preparing' || s === '2') return 2;
                    if (s === 'accepted' || s === '1') return 1;
                    return 0;
                };

                const title = titles[activeOrder.status] || titles.accepted;
                const currentStep = statusToStep(activeOrder.status);

                // 1. Manage Real iOS Live Activity
                const deliveryData = {
                    restaurantName: activeOrder.restaurantName || activeOrder.restaurant_name || (locale === 'en' ? 'Restaurant' : 'Ресторан'),
                    statusText: title,
                    timeRemaining: activeOrder.estimated_time || '20-30',
                    orderId: activeOrder.id?.toString().slice(-4) || '0000',
                    itemsCount: activeOrder.items?.length || 1,
                    totalAmount: activeOrder.totalPrice || activeOrder.total_price ? `₴${activeOrder.totalPrice || activeOrder.total_price}` : '₴0',
                    courierName: activeOrder.courierName || activeOrder.courier?.name || null,
                    courierPhoto: activeOrder.courierPhoto || activeOrder.courier?.photo || null,
                    courierPhone: activeOrder.courierPhone || activeOrder.courier?.phone || activeOrder.courier?.phoneNumber || null,
                    distance: activeOrder.navigationStats?.toClientDistance || (currentStep >= 4 ? (locale === 'en' ? 'Nearby' : 'Вже поруч') : null),
                    currentStep: currentStep
                };

                const state = {
                    title: title,
                    subtitle: JSON.stringify(deliveryData),
                };

                const config = {
                    backgroundColor: '#000000',
                    titleColor: '#FFFFFF',
                    subtitleColor: '#AAAAAA',
                    progressViewTint: '#e334e3',
                };

                const startNew = () => {
                    try {
                        const response = LiveActivity.startActivity(state, config);
                        activityId.current = typeof response === 'string' ? response : response?.id;
                        if (response?.pushToken) {
                            console.log('[LiveActivity] Push token:', response.pushToken);
                            // TODO: send to backend → api.post('/user/order/live-activity-token', { orderId: activeOrder.id, token: response.pushToken });
                        }
                        console.log('[LiveActivity] Started:', activityId.current);
                    } catch (err) {
                        console.warn('[LiveActivity] Failed to start:', err);
                    }
                };

                if (!activityId.current) {
                    startNew();
                } else {
                    try {
                        LiveActivity.updateActivity(activityId.current, state);
                        console.log('[LiveActivity] Updated:', activityId.current);
                    } catch (err) {
                        const msg = err?.message ?? String(err);
                        if (msg.includes('ActivityNotFoundException') || msg.includes('not found')) {
                            // iOS silently killed the activity (restart / timeout).
                            // Clear the stale ID and start a brand new one.
                            console.warn('[LiveActivity] Stale ID detected — restarting activity.');
                            activityId.current = null;
                            startNew();
                        } else {
                            console.warn('[LiveActivity] Update failed:', err);
                        }
                    }
                }

                activeOrderId.current = activeOrder.id;
                activeOrderStatus.current = activeOrder.status;
            }
        } else if (!activeOrder && activeOrderId.current) {
            // Order finished or cancelled
            if (activityId.current) {
                const finalState = {
                    title: locale === 'en' ? 'Order Finished' : 'Замовлення Завершено',
                    subtitle: JSON.stringify({ statusText: locale === 'en' ? 'Enjoy your meal!' : 'Смачного!' }),
                };
                LiveActivity.stopActivity(activityId.current, finalState);
                activityId.current = null;
            }
            activeOrderId.current = null;
            activeOrderStatus.current = null;
        }

    }, [orders, locale]);
}
