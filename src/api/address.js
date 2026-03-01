import client from './client';

/**
 * Create a new address.
 * @param {Object} data - AddressCreateRequest
 *   { street: string, city: string, latitude: number, longitude: number, ... }
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
