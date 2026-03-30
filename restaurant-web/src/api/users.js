import client from './client';

/**
 * Get paginated list of users (Admin only).
 * GET /admin/users
 */
export const fetchAllUsers = async (params = { page: 1, pageSize: 20 }) => {
    const response = await client.get('/admin/users', { 
        params: {
            page: params.page,
            pageSize: params.pageSize
        }
    });
    return response;
};

/**
 * Assign courier role to a user.
 * POST /admin/courier/{id}
 */
export const adminCreateCourier = (id) =>
    client.post(`/admin/courier/${id}`);

/**
 * Remove courier role from a user.
 * DELETE /admin/courier/{id}
 */
export const adminDeleteCourier = (id) =>
    client.delete(`/admin/courier/${id}`);

/**
 * Generic role update (Admin only).
 * PUT /admin/users/{id}/role
 * @param {number} userId
 * @param {string|number} role
 */
export const adminUpdateUserRole = (userId, role) =>
    client.post(`/admin/users/${userId}/role`, { id: role });
