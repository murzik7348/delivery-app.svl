import api from './api';

export const productService = {
  // 📦 PRODUCTS
  getAll: () => api.get('/products'),
  getById: (id) => api.get(`/products/${id}`),
};