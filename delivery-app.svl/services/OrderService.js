import { createDelivery, getMyDeliveries } from '../src/api';

/**
 * OrderService — submits and fetches orders via the real Delivery API.
 */
class OrderService {

    /**
     * Creates a new delivery order on the backend.
     * @param {Object} orderPayload - Cart data built in useCheckoutFlow
     * @returns {Object} The created order/delivery from the backend
     */
    static async createOrder(orderPayload) {
        // Validate address ID to be a proper Int32. Fallback to 0 if not provided or invalid.
        // The API returns addresses with "addressId", but older local state used "id"
        console.log('[OrderService] received payload address:', orderPayload.address);
        const rawAddressId = orderPayload.address?.addressId || orderPayload.address?.id;
        const addressId = rawAddressId ? parseInt(rawAddressId, 10) : 0;

        // Strict mapping: backend paymentMethodId=1 is Cash, paymentMethodId=2 is Card/Online (LiqPay)
        // Frontend: id='1' = Cash, id='2' = Apple Pay/Card (mirrors backend IDs directly)
        const isOnline = orderPayload.paymentInfo?.id === '2' || 
                         orderPayload.paymentInfo?.type?.toLowerCase().includes('apple') || 
                         orderPayload.paymentInfo?.type?.toLowerCase().includes('card') || 
                         orderPayload.paymentInfo?.type?.toLowerCase().includes('онлайн') ||
                         orderPayload.paymentInfo?.type?.toLowerCase().includes('visa');
        
        const paymentMethodId = isOnline ? 2 : 1;

        // Map the app's internal cart payload to the exact API DeliveryCreateRequest shape.
        const deliveryPayload = {
            products: (orderPayload.items ?? []).map((item) => ({
                productId: parseInt(item.product_id ?? item.id, 10),
                quantity: item.quantity,
            })),
            addressId: addressId || 0,
            paymentMethodId: paymentMethodId || 0,
            description: orderPayload.note || "Без коментарів",
            Description: orderPayload.note || "Без коментарів",
        };

        console.log('[OrderService] Final delivery payload:', JSON.stringify(deliveryPayload, null, 2));

        const serverResponse = await createDelivery(deliveryPayload);
        console.log('[OrderService] Raw serverResponse from createDelivery:', JSON.stringify(serverResponse, null, 2));

        // The API might return the deliveryId directly as a number or string.
        // We handle various casing and field names used by different backends (C#, Java, Node).
        let realDeliveryId = null;
        if (typeof serverResponse === 'number') {
            realDeliveryId = serverResponse;
        } else if (typeof serverResponse === 'string' && !isNaN(parseInt(serverResponse, 10))) {
            realDeliveryId = parseInt(serverResponse, 10);
        } else if (typeof serverResponse === 'object' && serverResponse !== null) {
            // Robust check for ID in various shapes
            realDeliveryId =
                serverResponse?.deliveryId ??
                serverResponse?.id ??
                serverResponse?.ID ??
                serverResponse?.DeliveryId ??
                serverResponse?.orderId ??
                serverResponse?.OrderId ??
                serverResponse?.idDelivery;
        }

        // 1. Calculate precise creation time
        const createdAt = serverResponse?.createdAt ? new Date(serverResponse.createdAt) : new Date();
        const formattedTime = createdAt.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        console.log(`[OrderService] Order created at exact time: ${formattedTime}`);

        // 2. Calculate dynamic estimated delivery time
        // Base time: 15 mins for processing and courier assignment
        let estimatedMinutes = 15;

        // Add time based on items
        (orderPayload.items || []).forEach(item => {
            const name = (item.name || item.productName || '').toLowerCase();
            const qty = item.quantity || 1;

            if (name.includes('піца') || name.includes('pizza')) {
                // Pizzas take 15 mins each to bake
                estimatedMinutes += (15 * qty);
            } else if (name.includes('суші') || name.includes('рол') || name.includes('sushi') || name.includes('roll')) {
                // Sushi takes 10 mins each to prepare
                estimatedMinutes += (10 * qty);
            } else if (name.includes('бургер') || name.includes('burger')) {
                // Burgers take 8 mins each
                estimatedMinutes += (8 * qty);
            } else if (name.includes('шашлик')) {
                // Shashlyk takes 20 mins each
                estimatedMinutes += (20 * qty);
            } else {
                // Default preparation time for other items
                estimatedMinutes += (5 * qty);
            }
        });

        // Cap maximum preparation time to avoid absurd estimates
        if (estimatedMinutes > 120) estimatedMinutes = 120;

        console.log(`[OrderService] Estimated cooking + delivery time: ${estimatedMinutes} minutes`);

        const estimatedDeliveryTime = new Date(createdAt.getTime() + estimatedMinutes * 60000);

        // Normalise the response to match the shape existing Redux (ordersSlice) expects.
        // IMPORTANT: `serverDeliveryId` is the REAL numeric ID from the backend.
        //            `id` may fall back to a local ORD-timestamp string if the backend returned nothing.
        //            Only `serverDeliveryId` should be used for the LiqPay payment call.
        // Normalise the response using the unified normalization method
        return OrderService.normalizeOrder({
            id: realDeliveryId?.toString() ?? `ORD-${createdAt.getTime()}`,
            deliveryId: realDeliveryId,
            serverDeliveryId: realDeliveryId,
            ...orderPayload,
            status: serverResponse?.status ?? 'accepted',
            createdAt: createdAt.toISOString(),
            date: createdAt.toISOString(),
            estimatedDeliveryTime: estimatedDeliveryTime.toISOString(),
            estimatedMinutes: estimatedMinutes
        });
    }

    /**
     * Приводить дані замовлення з будь-якого формату бекенду до єдиного вигляду.
     * Фіксує: назву товарів, суму, дані кур'єра, statusDelivery (число або рядок).
     */
    static normalizeOrder(item) {
        if (!item) return null;

        const id = item.deliveryId?.toString() || item.id?.toString();

        // Map numeric OR string statusDelivery from backend to internal key
        // Backend returns statusDelivery as a string: "Created", "Accepted", "Preparing",
        // "ReadyForPickup", "Delivering", "Delivered", "Canceled"
        const numericStatusMap = { 
            0: 'created', 
            1: 'accepted',        
            2: 'preparing',       
            3: 'ready_for_pickup',
            4: 'delivering',      
            5: 'delivered',       
            6: 'canceled'
        };
        const stringStatusMap = {
            'created': 'created',
            'accepted': 'accepted',
            'restaurantconfirmed': 'accepted',
            'restaurant_confirmed': 'accepted',
            'preparing': 'preparing',
            'readyforpickup': 'ready_for_pickup',
            'ready_for_pickup': 'ready_for_pickup',
            'ready': 'ready_for_pickup',
            'pickedup': 'delivering',
            'picked_up': 'delivering',
            'delivering': 'delivering',
            'delivered': 'delivered',
            'completed': 'delivered',
            'canceled': 'canceled',
            'cancelled': 'canceled',
        };

        const rawStatus = item.statusDelivery ?? item.deliveryStatus ?? item.status;
        let sNum = -1;
        let status = 'created';

        if (typeof rawStatus === 'number') {
            sNum = rawStatus;
            status = numericStatusMap[sNum] ?? 'created';
        } else if (rawStatus != null && !isNaN(Number(rawStatus)) && rawStatus !== '') {
            sNum = Number(rawStatus);
            status = numericStatusMap[sNum] ?? 'created';
        } else if (rawStatus) {
            // String status from backend — normalize to lowercase, strip spaces
            const sStr = String(rawStatus).toLowerCase().replace(/[^a-z_]/g, '');
            status = stringStatusMap[sStr] ?? sStr;
            // Derive sNum from resolved status for deliveryStatus field
            const reverseMap = { created:0, accepted:1, preparing:2, ready_for_pickup:3, delivering:4, delivered:5, canceled:6 };
            sNum = reverseMap[status] ?? -1;
        }


        let paymentMethodStr = item.paymentMethod;

        // Нормалізуємо список товарів — перевіряємо всі можливі назви полів
        const normalizedItems = (item.products || item.items || []).map(p => ({
            ...p,
            productName: p.productName || p.name || 'Товар',
            quantity: p.quantity || 1,
            totalLineAmount: p.totalLineAmount ?? ((p.price ?? 0) * (p.quantity || 1)),
        }));

        return {
            ...item,
            paymentMethod: paymentMethodStr,
            id,
            deliveryId: item.deliveryId || item.id,
            status,
            statusDelivery: status,
            deliveryStatus: sNum,
            items: normalizedItems,
            totalPrice: item.totalPrice || item.total || 0,
            statusTimestamps: item.statusTimestamps || {
                created: item.createdAt || new Date().toISOString(),
                accepted: null,
                paid: null,
                preparing: null,
                arrived_at_restaurant: null,
                ready_for_pickup: null,
                delivering: null,
                completed: null,
            },
            // Дані кур'єра
            courierName: item.courier?.name || item.courierName || null,
            courierPhone: item.courier?.phoneNumber || item.courierPhone || null,
            courierPhoto: item.courier?.photoUrl || item.courierPhoto || null,
            courierRating: item.courier?.rating ?? item.courierRating ?? null,
        };
    }

    /**
     * Отримує всі замовлення поточного користувача (нормалізовані).
     */
    static async getActiveOrders() {
        const response = await getMyDeliveries();
        // /deliveries/my returns a SINGLE object (not an array)
        // Wrap it in an array if needed, filter null
        let items;
        if (Array.isArray(response)) {
            items = response;
        } else if (response && typeof response === 'object' && response.deliveryId != null) {
            items = [response];
        } else if (response?.items) {
            items = response.items;
        } else {
            items = [];
        }
        return items.map(item => OrderService.normalizeOrder(item)).filter(Boolean);
    }

    /**
     * Отримує одне замовлення за ID із серверу (для polling).
     */
    static async getOrderById(id) {
        const orders = await OrderService.getActiveOrders();
        return orders.find(o => String(o.id) === String(id)) || null;
    }
}

export default OrderService;
