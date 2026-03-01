import client from './client';

/**
 * Get all product categories.
 */
export const getCategories = () => client.get('/category');

/**
 * Create a new category (admin).
 * @param {string} name - Category name (sent as plain JSON string)
 */
export const createCategory = (name) =>
    client.post('/category', JSON.stringify(name));

/**
 * Update an existing category name (admin).
 * @param {number} categoryId - Category ID
 * @param {string} name       - New category name
 */
export const updateCategory = (categoryId, name) =>
    client.put(`/category/${categoryId}`, JSON.stringify(name));
