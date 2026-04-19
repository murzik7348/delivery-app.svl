import { useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { showDynamicIsland, hideDynamicIsland } from '../store/uiSlice';

/**
 * useLiveActivitySync automatically observes the Redux `ordersSlice`.
 * 
 * It triggers the IN-APP React Native <DynamicIsland /> component 
 * to show order updates to the user in a beautiful, liquid-glass way.
 */
export default function useLiveActivitySync() {
    const dispatch = useDispatch();
    const orders = useSelector(state => state.orders.orders);
    const locale = useSelector(state => state.language?.locale ?? 'uk');
    const dynamicIslandVisible = useSelector(state => state.ui.dynamicIsland.visible);

    // Keep track of the currently synced order ID and status to avoid redundant starts
    const activeOrderId = useRef(null);
    const activeOrderStatus = useRef(null);

    useEffect(() => {
        // Find the most recent active order
        const activeOrder = orders.find(o => o.status !== 'completed' && o.status !== 'cancelled');

        if (activeOrder) {
            // Only dispatch if the order ID or the status changed!
            if (activeOrderId.current !== activeOrder.id || activeOrderStatus.current !== activeOrder.status) {
                const titles = {
                    accepted: locale === 'en' ? 'Order Accepted' : 'Замовлення Прийнято',
                    preparing: locale === 'en' ? 'Cooking' : 'Готується',
                    delivering: locale === 'en' ? 'On the way' : 'В дорозі'
                };

                const messages = {
                    accepted: locale === 'en' ? 'Kitchen received your order' : 'Ресторан отримав замовлення',
                    preparing: locale === 'en' ? 'Chef is doing magic' : 'Шеф-кухар вже чаклує',
                    delivering: locale === 'en' ? 'Courier is rushing to you!' : 'Курʼєр вже поспішає до вас!'
                };

                const icons = {
                    accepted: 'receipt-outline',
                    preparing: 'restaurant-outline',
                    delivering: 'bicycle-outline'
                };

                dispatch(showDynamicIsland({
                    title: titles[activeOrder.status] || titles.accepted,
                    message: messages[activeOrder.status] || messages.accepted,
                    icon: icons[activeOrder.status] || 'checkmark-circle',
                    type: 'info'
                }));

                activeOrderId.current = activeOrder.id;
                activeOrderStatus.current = activeOrder.status;
            }
        } else if (!activeOrder && activeOrderId.current) {
            if (activeOrderStatus.current === 'delivering') {
                // If the last known status was delivering and now it's gone, it means completed!
                dispatch(showDynamicIsland({
                    title: locale === 'en' ? 'Order Delivered!' : 'Замовлення Доставлено!',
                    message: locale === 'en' ? 'Enjoy your meal 🍔' : 'Смачного! 🍔',
                    icon: 'gift-outline',
                    type: 'success'
                }));
            }
            activeOrderId.current = null;
            activeOrderStatus.current = null;
        }

    }, [orders, locale, dispatch]);
}
