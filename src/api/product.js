import client from './client';

/**
 * Create a new product (admin / restaurant).
 * @param {Object} data - ProductCreateRequest
 *   { name: string, description: string, price: number, categoryId: number, restaurantId: number }
 */
export const createProduct = (data) => client.post('/product', data);

/**
 * Get paginated list of products with optional filters.
 * @param {Object} params
 * @param {number} [params.page=1]
 * @param {number} [params.pageSize=20]
 * @param {number} [params.categoryId]
 * @param {number} [params.restaurantId]
 */
export const getProducts = (params = {}) =>
    client.get('/product', {
        params: {
            page: params.page ?? 1,
            pageSize: params.pageSize ?? 20,
            ...(params.categoryId !== undefined && { categoryId: params.categoryId }),
            ...(params.restaurantId !== undefined && { restaurantId: params.restaurantId }),
        },
    });

/**
 * Update an existing product (admin / restaurant).
 * @param {number} productId
 * @param {Object} data - ProductUpdateRequest
 *   { name?: string, description?: string, price?: number, categoryId?: number }
 */
export const updateProduct = (productId, data) =>
    client.put(`/product/${productId}`, data);

/**
 * Delete a product by ID.
 * @param {number} productId
 */
export const deleteProduct = (productId) =>
    client.delete(`/product/${productId}`);
