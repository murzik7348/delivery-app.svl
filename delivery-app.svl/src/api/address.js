import client from './client';

/**
 * Create a new address.
 * @param {Object} data - AddressCreateRequest
 *   { title?: string, latitude: number, longitude: number, house?: string, apartment?: string, entrance?: string, floor?: string, comment?: string, is_default: boolean }
 */
export const createAddress = (data) => client.post('/address', data);

/**
 * Get all saved addresses for the authenticated user.
 */
export const getAddresses = () => client.get('/address');

/**
 * Set an address as the default delivery address.
 * @param {number} id - Address ID
 */
export const setDefaultAddress = (id) => client.put(`/address/${id}/default`);

/**
 * Delete an address by ID.
 * @param {number} id - Address ID
 */
export const deleteAddress = (id) => client.delete(`/address/${id}`);

/**
 * Get delivery address by delivery ID (requires admin or authorized user/courier).
 * @param {number} id - Delivery ID
 */
export const getDeliveryAddress = (id) => client.get(`/admin/delivery/${id}/address`);

/**
 * Get delivery tariff and coefficient for an address.
 * @param {number} id - Address ID
 */
export const getAddressTariff = (id) => client.get(`/address/tarif/${id}`);


