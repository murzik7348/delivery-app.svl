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
        // Map the app's internal cart payload to the API's DeliveryCreateRequest shape
        const deliveryPayload = {
            addressId: orderPayload.address?.id ?? null,
            items: (orderPayload.items ?? []).map((item) => ({
                productId: item.product_id ?? item.id,
                quantity: item.quantity,
            })),
            note: orderPayload.note ?? null,
            promoCode: orderPayload.promo ?? null,
            type: orderPayload.type ?? 'delivery',
        };

        const serverResponse = await createDelivery(deliveryPayload);

        // Normalise the response to match the shape existing Redux (ordersSlice) expects
        return {
            id: serverResponse?.id?.toString() ?? `ORD-${Date.now()}`,
            ...orderPayload,
            status: serverResponse?.status ?? 'accepted',
            createdAt: serverResponse?.createdAt ?? new Date().toISOString(),
            date: serverResponse?.createdAt ?? new Date().toISOString(),
        };
    }

    /**
     * Fetches all deliveries belonging to the authenticated user.
     * @returns {Array} List of orders
     */
    static async getActiveOrders() {
        const response = await getMyDeliveries();
        return Array.isArray(response) ? response : response?.items ?? [];
    }
}

export default OrderService;
