import client from './client';

/**
 * Create a new product (admin / restaurant).
 * @param {Object|FormData} data - ProductCreateRequest or FormData
 */
export const createProduct = (data) => {
    const isFormData = data instanceof FormData;
    return client.post('/product', data, {
        headers: {
            'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
        },
    });
};

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

/**
 * Update product image separately.
 * @param {FormData} formData - Multipart with ProductId and Image
 */
export const uploadProductImage = (formData) =>
    client.put('/product/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });

/**
 * Delete product image.
 * @param {number} productId
 */
export const deleteProductImage = (productId) =>
    client.delete(`/product/${productId}/image`);
