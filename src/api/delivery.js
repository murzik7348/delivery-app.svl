import client from './client';

/**
 * Create a new delivery order.
 * @param {Object} data - DeliveryCreateRequest
 *   { addressId: number, items: Array<{ productId: number, quantity: number }> }
 */
export const createDelivery = (data) => client.post('/deliveries', data);

/**
 * Get all deliveries belonging to the authenticated user.
 */
export const getMyDeliveries = () => client.get('/deliveries/my');

/**
 * Accept / confirm a delivery (restaurant-side action from client perspective).
 * @param {number} id - Delivery ID
 */
export const acceptDelivery = (id) => client.put(`/deliveries/${id}/accepted`);
