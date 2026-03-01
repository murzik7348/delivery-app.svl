import client from './client';

/**
 * Get paginated list of deliveries assigned to the courier.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.deliveryStatus]  - DeliveryStatus enum value
 */
export const getCourierDeliveries = (params = {}) =>
    client.get('/courier/deliveries', {
        params: {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
            ...(params.deliveryStatus !== undefined && {
                deliveryStatus: params.deliveryStatus,
            }),
        },
    });

/**
 * Courier accepts a delivery (moves status to ACCEPTED).
 * @param {number} id - Delivery ID
 */
export const courierAcceptDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/accepted`);

/**
 * Courier marks a delivery as picked up (moves status to PICKED_UP).
 * @param {number} id - Delivery ID
 */
export const courierPickupDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/pickedup`);

/**
 * Courier confirms delivery completion (moves status to DELIVERED).
 * @param {number} id - Delivery ID
 */
export const courierConfirmDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/confirmations`);
