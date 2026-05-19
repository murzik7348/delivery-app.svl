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

/**
 * Restaurant marks a delivery order as cooking (preparing).
 * @param {number} id - Delivery ID
 */
export const restaurantCookingDelivery = (id) =>
    client.put(`/restaurant/deliveries/${id}/cooking`);

/**
 * Restaurant marks a delivery order as ready for pickup.
 * @param {number} id - Delivery ID
 */
export const restaurantReadyDelivery = (id) =>
    client.put(`/restaurant/deliveries/${id}/ready`);

/**
 * Get all restaurants (for the customer app catalog)
 */
export const getRestaurants = () =>
    client.get('/restaurant');
