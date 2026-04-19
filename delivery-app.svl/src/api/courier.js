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
 * Courier books a delivery (assigns courierId without status change).
 * @param {number} id - Delivery ID
 */
export const courierBookDelivery = (id) =>
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

/**
 * Set the courier online status.
 * @param {boolean} isOnline 
 */
export const courierSetOnlineStatus = async (isOnline) => {
    try {
        return await client.put('/courier/status', { isOnline });
    } catch (err) {
        if (err.status === 404) {
            console.warn('⚠️ [CourierAPI] Endpoint /courier/status not found on backend. Skipping status update.');
            return null;
        }
        throw err;
    }
};

/**
 * Update the courier's GPS location.
 * @param {number} latitude 
 * @param {number} longitude 
 */
export const courierUpdateLocation = async (latitude, longitude) => {
    try {
        return await client.put('/courier/location', { latitude, longitude });
    } catch (err) {
        if (err.status === 404) {
            console.warn('⚠️ [CourierAPI] Endpoint /courier/location not found on backend. Skipping location update.');
            return null;
        }
        throw err;
    }
};
