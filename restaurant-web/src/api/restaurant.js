import client from './client';

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
  client.put(`/restaurant/deliveries/${id}/prepare`);

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

export const updateRestaurantStatus = (isOpen) =>
  client.put('/restaurant', { isOpen });

// Product / Menu Management
export const fetchProducts = (params = { page: 1, pageSize: 50, restaurantId: null }) => 
  client.get('/product', { params });

export const updateProduct = (id, data) => 
  client.put(`/product/${id}`, data);
