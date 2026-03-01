import { useEffect, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Platform } from 'react-native';
import * as LiveActivity from 'expo-live-activity';

/**
 * useLiveActivitySync automatically observes the Redux `ordersSlice`.
 * 
 * If there is an active order (status !== 'completed' && status !== 'cancelled'),
 * it synchronizes that order's data to the iOS Dynamic Island / Lock Screen.
 * 
 * This completely decouples Live Activity native calls from UI buttons (like Checkout or Admin Panel).
 */
export default function useLiveActivitySync() {
    const orders = useSelector(state => state.orders.orders);
    const locale = useSelector(state => state.language?.locale ?? 'uk');

    // Keep track of the currently synced order ID to avoid redundant starts
    const activeActivityOrderId = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'ios') return;

        // Find the most recent active order
        const activeOrder = orders.find(o => o.status !== 'completed' && o.status !== 'cancelled');

        const syncToIsland = async () => {
            if (activeOrder) {
                // Determine translation strings based on locale
                const titles = {
                    accepted: locale === 'en' ? 'Order Accepted' : 'Замовлення Прийнято',
                    preparing: locale === 'en' ? 'Cooking' : 'Готується',
                    delivering: locale === 'en' ? 'On the way' : 'В дорозі'
                };

                const rideData = JSON.stringify({
                    status: activeOrder.status,
                    driverName: "Олександр", // Mock courier
                    time: "24 min",
                    orderId: activeOrder.id.slice(-4),
                    totalPrice: `${activeOrder.total?.toFixed(0) || 0} ₴`
                });

                try {
                    if (activeActivityOrderId.current !== activeOrder.id) {
                        // Start a new activity if we aren't tracking one
                        console.log(`[useLiveActivitySync] Starting Live Activity for Order ${activeOrder.id}`);
                        LiveActivity.startActivity({
                            title: titles[activeOrder.status] || titles.accepted,
                            subtitle: rideData, // Swift decoding
                            progressBar: {
                                date: new Date(Date.now() + 24 * 60 * 1000).getTime(),
                            }
                        }, {
                            backgroundColor: '#0F0F0F',
                            titleColor: '#ffffff',
                            subtitleColor: '#ffffff',
                            timerType: 'circular'
                        });
                        activeActivityOrderId.current = activeOrder.id;
                    } else {
                        // Update existing activity
                        console.log(`[useLiveActivitySync] Updating Live Activity for Order ${activeOrder.id}`);
                        LiveActivity.updateActivity({
                            title: titles[activeOrder.status] || titles.accepted,
                            subtitle: rideData,
                            progressBar: {
                                date: new Date(Date.now() + 24 * 60 * 1000).getTime(),
                            }
                        });
                    }
                } catch (e) {
                    console.warn("[useLiveActivitySync] Failed to sync Live Activity:", e);
                }
            } else if (!activeOrder && activeActivityOrderId.current) {
                // If there are no active orders but we have an activity running, end it.
                console.log(`[useLiveActivitySync] Ending Live Activity for Order ${activeActivityOrderId.current}`);
                try {
                    LiveActivity.endActivity();
                } catch (e) {
                    console.warn("[useLiveActivitySync] Failed to end Live Activity:", e);
                }
                activeActivityOrderId.current = null;
            }
        };

        syncToIsland();

    }, [orders, locale]); // Re-run effect whenever orders array or language changes
}
