import client from './client';

/**
 * Get paginated deliveries for the authenticated restaurant.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.status] - DeliveryStatus enum value
 */
export const getRestaurantDeliveries = (params = {}) =>
    client.get('/restaurant/deliveries', {
        params: {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
            ...(params.status !== undefined && { status: params.status }),
        },
    });

/**
 * Restaurant confirms (accepts) a delivery order.
 * @param {number} id - Delivery ID
 */
export const restaurantConfirmDelivery = (id) =>
    client.put(`/restaurant/deliveries/${id}/confirm`);

/**
 * Restaurant cancels a delivery order.
 * @param {number} id - Delivery ID
 */
export const restaurantCancelDelivery = (id) =>
    client.put(`/restaurant/deliveries/${id}/cancel`);
