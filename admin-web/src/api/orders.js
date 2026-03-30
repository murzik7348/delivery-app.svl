import client from './client';

export const fetchAllDeliveries = (params = { page: 1, pageSize: 20, status: null }) => {
    // We send status only if it exists, since status is an Enum
    const query = { page: params.page, pageSize: params.pageSize };
    if (params.status !== null && params.status !== undefined) {
        query.status = params.status;
    }
    return client.get('/admin/delivery', { params: query });
};

export const confirmDeliveryRestaurant = (id) => client.put(`/restaurant/deliveries/${id}/confirm`);
export const cancelDeliveryRestaurant = (id) => client.put(`/restaurant/deliveries/${id}/cancel`);
export const acceptDelivery = (id) => client.put(`/restaurant/deliveries/${id}/confirm`, {});

// Courier Actions (used to simulate full board movement)
export const acceptDeliveryCourier = (id) => client.put(`/courier/deliveries/${id}/accepted`);
export const pickupDeliveryCourier = (id) => client.put(`/courier/deliveries/${id}/pickedup`);
export const confirmDeliveryCourier = (id) => client.put(`/courier/deliveries/${id}/confirmations`);
// Admin Actions
export const deleteDelivery = (id) => client.delete(`/admin/delivery/${id}`);
