import { createDelivery, getMyDeliveries, getAddresses } from '../src/api';

/**
 * OrderService — submits and fetches orders via the real Delivery API.
 */
class OrderService {
    static geocodeCache = new Map();
    static geocodeFailed = new Map();
    static globalGeocodePauseUntil = 0;

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
            description: (orderPayload.note?.trim() || "Без коментарів").slice(0, 100),
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
    static normalizeOrder(item, savedAddresses = []) {
        if (!item) return null;

        const id = item.deliveryId?.toString() || item.id?.toString();

        // Map numeric OR string statusDelivery from backend to internal key
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
            const sStr = String(rawStatus).toLowerCase().replace(/[^a-z_]/g, '');
            status = stringStatusMap[sStr] ?? sStr;
            const reverseMap = { created:0, accepted:1, preparing:2, ready_for_pickup:3, delivering:4, delivered:5, canceled:6 };
            sNum = reverseMap[status] ?? -1;
        }

        let paymentMethodStr = item.paymentMethod;

        const normalizedItems = (item.products || item.items || []).map(p => ({
            ...p,
            productName: p.productName || p.name || 'Товар',
            quantity: p.quantity || 1,
            totalLineAmount: p.totalLineAmount ?? ((p.price ?? 0) * (p.quantity || 1)),
        }));

        const addressId = item.addressId || item.address?.addressId || item.address?.id || item.deliveryAddress?.addressId || item.deliveryAddress?.id;
        let matchedAddr = null;
        if (addressId && Array.isArray(savedAddresses)) {
            matchedAddr = savedAddresses.find(a => Number(a.addressId || a.id) === Number(addressId));
        }

        const addressObj = (item.address && typeof item.address === 'object') ? item.address : null;

        const customerLatitude = Number(
            item.address?.latitude || 
            item.address?.Latitude || 
            item.address?.lat || 
            item.address?.Lat || 
            item.customerAddress?.latitude || 
            item.customerAddress?.Latitude || 
            item.customerAddress?.lat || 
            item.customerAddress?.Lat || 
            item.deliveryAddress?.latitude || 
            item.deliveryAddress?.Latitude || 
            item.deliveryAddress?.lat || 
            item.deliveryAddress?.Lat || 
            item.customer?.address?.latitude || 
            item.customer?.address?.Latitude || 
            item.customer?.address?.lat || 
            item.customer?.address?.Lat || 
            item.user?.address?.latitude || 
            item.user?.address?.Latitude || 
            item.user?.address?.lat || 
            item.user?.address?.Lat || 
            item.customerLatitude || 
            item.CustomerLatitude || 
            item.customerLat || 
            item.CustomerLat || 
            item.customer?.latitude || 
            item.customer?.Latitude || 
            item.customer?.lat || 
            item.customer?.Lat || 
            item.user?.latitude || 
            item.user?.Latitude || 
            item.user?.lat || 
            item.user?.Lat || 
            item.latitude || 
            item.Latitude || 
            item.lat || 
            item.Lat || 
            matchedAddr?.latitude || 
            matchedAddr?.Latitude || 
            matchedAddr?.lat || 
            matchedAddr?.Lat || 
            (48.55028 + (Number(item.deliveryId || item.id || 0) % 8) * 0.0002)
        );

        const customerLongitude = Number(
            item.address?.longitude || 
            item.address?.Longitude || 
            item.address?.lng || 
            item.address?.Lng || 
            item.customerAddress?.longitude || 
            item.customerAddress?.Latitude || 
            item.customerAddress?.lng || 
            item.customerAddress?.Lng || 
            item.deliveryAddress?.longitude || 
            item.deliveryAddress?.Longitude || 
            item.deliveryAddress?.lng || 
            item.deliveryAddress?.Lng || 
            item.customer?.address?.longitude || 
            item.customer?.address?.Longitude || 
            item.customer?.address?.lng || 
            item.customer?.address?.Lng || 
            item.user?.address?.longitude || 
            item.user?.address?.Longitude || 
            item.user?.address?.lng || 
            item.user?.address?.Lng || 
            item.customerLongitude || 
            item.CustomerLongitude || 
            item.customerLng || 
            item.CustomerLng || 
            item.customer?.longitude || 
            item.customer?.Longitude || 
            item.customer?.lng || 
            item.customer?.Lng || 
            item.user?.longitude || 
            item.user?.Longitude || 
            item.user?.lng || 
            item.user?.Lng || 
            item.longitude || 
            item.Longitude || 
            item.lng || 
            item.Lng || 
            matchedAddr?.longitude || 
            matchedAddr?.Longitude || 
            matchedAddr?.lng || 
            matchedAddr?.Lng || 
            (23.000707 + (Number(item.deliveryId || item.id || 0) % 9) * 0.0002)
        );

        let addressString = item.addressText || 
                              (typeof item.address === 'string' ? item.address : null) || 
                              item.customerAddress?.address || 
                              item.deliveryAddress?.address || 
                              item.address?.address ||
                              matchedAddr?.address || 
                              (matchedAddr ? [
                                  matchedAddr.title, 
                                  matchedAddr.house ? `буд. ${matchedAddr.house}` : '', 
                                  matchedAddr.apartment ? `кв. ${matchedAddr.apartment}` : ''
                              ].filter(Boolean).join(', ') : null);

        if (!addressString && addressObj) {
            const parts = [];
            if (addressObj.house) parts.push(`буд. ${addressObj.house}`);
            if (addressObj.entrance) parts.push(`під'їзд ${addressObj.entrance}`);
            if (addressObj.floor) parts.push(`поверх ${addressObj.floor}`);
            if (addressObj.apartment) parts.push(`кв. ${addressObj.apartment}`);
            if (parts.length > 0) {
                addressString = parts.join(', ');
            }
        }

        if (!addressString) {
            addressString = 'Address N/A';
        }

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
            address: addressString,
            addressObj,
            restaurantLatitude: Number(
                item.restaurantLat || 
                item.RestaurantLat || 
                item.restaurant?.latitude || 
                item.restaurant?.Latitude || 
                item.restaurantLatitude || 
                item.RestaurantLatitude || 
                item.restaurant?.lat || 
                item.restaurant?.Lat || 
                item.restaurantAddress?.latitude || 
                item.restaurantAddress?.Latitude || 
                item.restaurantAddress?.lat || 
                item.restaurantAddress?.Lat || 
                48.5501 + (Number(item.deliveryId || item.id || 0) % 10) * 0.0002
            ),
            restaurantLongitude: Number(
                item.restaurantLng || 
                item.RestaurantLng || 
                item.restaurant?.longitude || 
                item.restaurant?.Longitude || 
                item.restaurantLongitude || 
                item.RestaurantLongitude || 
                item.restaurant?.lng || 
                item.restaurant?.Lng || 
                item.restaurantAddress?.longitude || 
                item.restaurantAddress?.Longitude || 
                item.restaurantAddress?.lng || 
                item.restaurantAddress?.Lng || 
                23.0004 + (Number(item.deliveryId || item.id || 0) % 7) * 0.0002
            ),
            customerLatitude,
            customerLongitude,
            courierLatitude: Number(item.courier?.latitude || item.courier?.lat || item.courierLatitude || item.courierLocation?.latitude || item.courierLocation?.lat || 0),
            courierLongitude: Number(item.courier?.longitude || item.courier?.lng || item.courierLongitude || item.courierLocation?.longitude || item.courierLocation?.lng || 0),
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
        
        let savedAddresses = [];
        try {
            savedAddresses = await getAddresses();
        } catch (e) {
            console.warn('[OrderService] getAddresses failed:', e);
        }

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

        const orders = items.map(item => OrderService.normalizeOrder(item, savedAddresses)).filter(Boolean);

        for (let order of orders) {
            await OrderService.enrichAddress(order);
        }

        return orders;
    }

    /**
     * Отримує одне замовлення за ID із серверу (для polling).
     */
    static async getOrderById(id) {
        const orders = await OrderService.getActiveOrders();
        return orders.find(o => String(o.id) === String(id)) || null;
    }

    /**
     * Збагачує адресу текстовим описом через зворотне геокодування
     */
    static async enrichAddress(order) {
        if (!order) return order;
        const needsEnrichment = !order.address || 
                                order.address === 'Address N/A' || 
                                order.address.startsWith('буд.') || 
                                order.address.startsWith('кв.');
        if (needsEnrichment && order.customerLatitude && order.customerLongitude) {
            const cacheKey = `${Number(order.customerLatitude).toFixed(5)},${Number(order.customerLongitude).toFixed(5)}`;
            if (OrderService.geocodeCache?.has(cacheKey)) {
                order.address = OrderService.geocodeCache.get(cacheKey);
                return order;
            }
            if (OrderService.geocodeFailed?.has(cacheKey)) {
                const lastAttempt = OrderService.geocodeFailed.get(cacheKey);
                if (Date.now() - lastAttempt < 60000) { // Don't retry for 60 seconds
                    return order;
                }
            }

            // If global geocoding is paused due to rate-limiting, skip it
            if (Date.now() < OrderService.globalGeocodePauseUntil) {
                return order;
            }

            try {
                let LocationApi = null;
                try {
                    LocationApi = require('expo-location');
                } catch {
                    // Not available
                }
                if (LocationApi && LocationApi.reverseGeocodeAsync) {
                    if (LocationApi.getForegroundPermissionsAsync) {
                        const { status } = await LocationApi.getForegroundPermissionsAsync();
                        if (status !== 'granted') {
                            return order;
                        }
                    }
                    const results = await LocationApi.reverseGeocodeAsync({
                        latitude: order.customerLatitude,
                        longitude: order.customerLongitude
                    });
                    if (results && results.length > 0) {
                        const addr = results[0];
                        const street = addr.street || addr.name || '';
                        const city = addr.city || addr.district || '';
                        const baseStreet = [street, city].filter(Boolean).join(', ');
                        
                        if (baseStreet) {
                            let finalAddr = baseStreet;
                            const suffixParts = [];
                            
                            const rawAddr = order.address;
                            if (rawAddr && rawAddr !== 'Address N/A') {
                                finalAddr = `${baseStreet}, ${rawAddr}`;
                            } else if (order.addressObj) {
                                const addressObj = order.addressObj;
                                if (addressObj.house) suffixParts.push(`буд. ${addressObj.house}`);
                                if (addressObj.entrance) suffixParts.push(`під'їзд ${addressObj.entrance}`);
                                if (addressObj.floor) suffixParts.push(`поверх ${addressObj.floor}`);
                                if (addressObj.apartment) suffixParts.push(`кв. ${addressObj.apartment}`);
                                if (suffixParts.length > 0) {
                                    finalAddr = `${baseStreet}, ${suffixParts.join(', ')}`;
                                }
                            }
                            order.address = finalAddr;
                            OrderService.geocodeCache.set(cacheKey, finalAddr);
                        }
                    }
                }
            } catch (e) {
                console.warn('[OrderService] enrichAddress failed:', e.message || e);
                const errorMsg = String(e.message || e).toLowerCase();
                if (errorMsg.includes('rate limit') || errorMsg.includes('too many requests')) {
                    // Pause geocoding globally for 3 minutes to avoid spamming the OS
                    OrderService.globalGeocodePauseUntil = Date.now() + 180000;
                    console.warn('⚠️ [OrderService] Geocoding rate limit hit. Pausing geocoding requests for 3 minutes.');
                }
                if (OrderService.geocodeFailed) {
                    OrderService.geocodeFailed.set(cacheKey, Date.now());
                }
            }
        }
        return order;
    }
}

export default OrderService;
