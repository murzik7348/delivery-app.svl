import client from './client';

/**
 * Create a new delivery order.
 * @param {Object} data - DeliveryCreateRequest
 *   { addressId: number, paymentMethodId: number, products: Array<{ productId: number, quantity: number }> }
 */
export const createDelivery = (data) => client.post('/deliveries', data);

/**
 * Get all deliveries belonging to the authenticated user.
 */
export const getMyDeliveries = (page = 1, pageSize = 20) => client.get(`/deliveries/my?page=${page}&pageSize=${pageSize}`);

/**
 * Accept / confirm a delivery (restaurant-side action from client perspective).
 * @param {number} id - Delivery ID
 */
export const acceptDelivery = (id) => client.put(`/deliveries/${id}/accepted`);
/**
 * User confirms delivery completion.
 * @param {number} id - Delivery ID
 */
export const userConfirmDelivery = (id) => client.put(`/deliveries/${id}/confirmations`);

/**
 * Fetch geographic delivery zones (polygons and prices).
 */
export const getDeliveryZones = () => client.get('/deliveries/zones', { _skipRetry: true, _silentErrors: [500] });

/**
 * Fetch list of delivery coefficients (public).
 */
export const getDeliveryCoefficients = () => client.get('/deliveries/coefficient');

/**
 * Toggle active state of a delivery coefficient (admin).
 * @param {number} id - Coefficient ID
 */
export const toggleDeliveryCoefficientActivityAdmin = (id) => client.post(`/admin/delivery/coefficient/${id}/activity`);
