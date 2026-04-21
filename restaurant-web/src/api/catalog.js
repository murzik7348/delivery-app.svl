import client from './client';

export const fetchProducts = (params = { page: 1, pageSize: 20 }) => 
  client.get('/product', { params });

export const createProduct = (data) => 
  client.post('/product', data);

export const updateProduct = (id, data) => 
  client.put(`/product/${id}`, data);

export const deleteProduct = (id) => 
  client.delete(`/product/${id}`);

export const fetchCategories = () => 
  client.get('/category');

// Custom additions based on new requirements:
export const fetchRestaurants = () => 
  client.get('/restaurant');

export const uploadProductImage = (productId, imageFile) => {
    const formData = new FormData();
    formData.append('ProductId', productId);
    formData.append('Image', imageFile);
    return client.put('/product/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
    });
};

export const deleteProductImage = (productId) => 
    client.delete(`/product/${productId}/image`);
