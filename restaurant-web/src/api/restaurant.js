import client, { DIRECT_API_URL } from './client';

export const fetchRestaurantDeliveries = (params = { page: 1, pageSize: 50, status: null }) => {
  const query = { page: params.page, pageSize: params.pageSize };
  if (params.status !== null && params.status !== undefined) {
    query.status = params.status;
  }
  return client.get('/restaurant/deliveries', { params: query });
};

export const acceptDelivery = (id) =>
  client.put(`/restaurant/deliveries/${id}/confirm`, {});

export const confirmDelivery = (id, data = {}) => {
  console.log('🛠️ [API] Confirming delivery for ID:', id, 'Data:', data);
  // Backend often requires at least an empty object {} to avoid 400 INVALID_STATUS
  return client.put(`/restaurant/deliveries/${id}/confirm`, data);
};

export const startPreparing = (id) =>
  client.put(`/restaurant/deliveries/${id}/cooking`, {});

export const markReady = (id) =>
  client.put(`/restaurant/deliveries/${id}/ready`);

// 0=created, 2=paid, 1=accepted, 3=preparing, 4=ready, 5=delivering, 6=delivered, 7=canceled
export const DELIVERY_STATUS = {
  0: 'created', 2: 'paid', 1: 'accepted', 3: 'preparing', 4: 'ready', 5: 'delivering', 6: 'delivered', 7: 'canceled',
};

export const cancelDelivery = (id, reason) =>
  client.put(`/restaurant/deliveries/${id}/cancel`, reason ? { reason } : {});

export const getRestaurantInfo = () =>
  client.get('/restaurant');

export const updateRestaurant = (data) =>
  client.put('/restaurant', data);

export const updateRestaurantStatus = updateRestaurant;

// Product / Menu Management
export const fetchProducts = (params = {}) => 
  client.get('/product', { params });

export const updateProduct = (id, data) => 
  client.put(`/product/${id}`, data);

export const uploadProductImage = (productId, imageFile) => {
  console.log('📤 [uploadProductImage] Attempting V7 (Proxy + Explicit Headers):', { productId, fileName: imageFile?.name });
  const formData = new FormData();
  formData.append('ProductId', productId);
  formData.append('Image', imageFile);
  
  return client.put('/product/image', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
};

export const uploadRestaurantImage = (restaurantId, imageFile) => {
    const formData = new FormData();
    formData.append('RestaurantId', restaurantId);
    formData.append('Image', imageFile);
    
    // Spec says POST /restaurant/image
    return client.post('/restaurant/image', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
};

export const deleteProductImage = (productId) => 
  client.delete(`/product/${productId}/image`);
