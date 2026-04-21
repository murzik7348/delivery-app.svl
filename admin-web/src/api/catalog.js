import client from './client';

export const fetchProducts = (params = { page: 1, pageSize: 20 }) => 
  client.get('/product', { params });

export const createProduct = (data) => {
  const isFormData = data instanceof FormData;
  return client.post('/product', data, {
    headers: {
      'Content-Type': isFormData ? 'multipart/form-data' : 'application/json',
    },
  });
};

export const updateProduct = (id, data) => 
  client.put(`/product/${id}`, data);

export const deleteProduct = (id) => 
  client.delete(`/product/${id}`);

export const fetchCategories = () => 
  client.get('/category');

// Custom additions based on new requirements:
export const fetchRestaurants = () => 
  client.get('/restaurant');

export const updateCategory = (categoryId, name) =>
    client.put(`/category/${categoryId}`, JSON.stringify(name), {
        headers: { 'Content-Type': 'application/json' }
    });

export const uploadCategoryImage = (categoryId, imageFile) => {
    const formData = new FormData();
    formData.append('CategoryId', categoryId);
    formData.append('Image', imageFile);
    
    return client.put('/category/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const uploadRestaurantImage = (imageFile) => {
    const formData = new FormData();
    formData.append('Image', imageFile);
    
    // Attempting PUT /restaurant/image (following product/category pattern)
    return client.put('/restaurant/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const uploadProductImage = (productId, imageFile) => {
    const formData = new FormData();
    formData.append('ProductId', productId);
    formData.append('Image', imageFile);
    
    return client.put('/product/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};
