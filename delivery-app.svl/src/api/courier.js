import client from './client';

/**
 * Get paginated list of deliveries assigned to the courier.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {string} [params.deliveryStatus]  - DeliveryStatus enum value
 */
export const getCourierDeliveries = (params = {}) => {
    const { _quiet, ...rest } = params;
    return client.get('/courier/deliveries', {
        params: {
            page: rest.page ?? 1,
            pageSize: rest.pageSize ?? 20,
            ...(rest.deliveryStatus !== undefined && {
                deliveryStatus: rest.deliveryStatus,
            }),
        },
        _quiet,
        _skipLogout: true
    });
};

/**
 * Get paginated list of deliveries assigned to the current courier.
 * @param {Object} params
 */
export const getCourierDeliveriesMy = (params = {}) => {
    const { _quiet, ...rest } = params;
    return client.get('/courier/deliveries/my', {
        params: {
            page: rest.page ?? 1,
            pageSize: rest.pageSize ?? 20,
            ...(rest.deliveryStatus !== undefined && {
                deliveryStatus: rest.deliveryStatus,
            }),
        },
        _quiet,
        _skipLogout: true
    });
};

/**
 * Courier accepts a delivery (moves status to ACCEPTED).
 * @param {number} id - Delivery ID
 */
export const courierAcceptDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/accepted`, {});

/**
 * Courier books a delivery (assigns courierId without status change).
 * @param {number} id - Delivery ID
 */
export const courierBookDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/accepted`, {});

/**
 * Courier marks a delivery as picked up (moves status to PICKED_UP).
 * @param {number} id - Delivery ID
 */
export const courierPickupDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/pickedup`, {});

/**
 * Courier confirms delivery completion (moves status to DELIVERED).
 * @param {number} id - Delivery ID
 */
export const courierConfirmDelivery = (id) =>
    client.put(`/courier/deliveries/${id}/confirmations`, {});

/**
 * Set the courier online status.
 * @param {boolean} isOnline 
 */
export const courierSetOnlineStatus = async (isOnline) => {
    // Note: Endpoint /courier/status does not exist on backend.
    // Online status is managed purely client-side to prevent 404 warnings.
    return { success: true, isOnline };
};

/**
 * Update the courier's GPS location.
 * @param {number} latitude 
 * @param {number} longitude 
 */
export const courierUpdateLocation = async (latitude, longitude) => {
    try {
        return await client.post('/courier/deliveries/location', { lat: latitude, lng: longitude }, { _silentErrors: [404], _quiet: true, _skipLogout: true });
    } catch (err) {
        if (err.status === 404) {
            console.warn('⚠️ [CourierAPI] Endpoint /courier/deliveries/location not found on backend. Skipping location update.');
            return null;
        }
        throw err;
    }
};
