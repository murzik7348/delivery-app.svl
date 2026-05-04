import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchRestaurantDeliveries,
  acceptDelivery,
  cancelDelivery,
  startPreparing,
  markReady,
  fetchProducts,
  uploadRestaurantImage,
  getRestaurantInfo,
  updateRestaurant,
} from '../../api/restaurant';
import { resolveImageUrl } from '../../api/client';
import { showToast } from './toastSlice';

export const updateRestaurantPhoto = createAsyncThunk(
  'restaurantOrders/updateRestaurantPhoto',
  async ({ restaurantId, imageFile }, { rejectWithValue, dispatch }) => {
    try {
      const response = await uploadRestaurantImage(restaurantId, imageFile);
      dispatch(showToast({ message: '✅ Фото оновлено!', type: 'success' }));
      return response;
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка оновлення фото', type: 'error' }));
      return rejectWithValue(err?.message);
    }
  }
);

export const fetchRestaurantInfo = createAsyncThunk(
  'restaurantOrders/fetchRestaurantInfo',
  async (_, { rejectWithValue }) => {
    try {
      const response = await getRestaurantInfo();
      return response;
    } catch (err) {
      return rejectWithValue(err?.message);
    }
  }
);

export const updateRestaurantInfo = createAsyncThunk(
  'restaurantOrders/updateRestaurantInfo',
  async (data, { rejectWithValue, dispatch }) => {
    try {
      const response = await updateRestaurant(data);
      dispatch(showToast({ message: '✅ Дані ресторану оновлено!', type: 'success' }));
      dispatch(fetchRestaurantInfo());
      return response;
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка оновлення даних', type: 'error' }));
      return rejectWithValue(err?.message);
    }
  }
);

// Backend Status Mapping
export const DELIVERY_STATUS = {
  0: 'created',
  1: 'accepted',
  2: 'preparing',
  3: 'ready_for_pickup',
  4: 'delivering',
  5: 'delivered',
  6: 'canceled',
};

const STATUS_MAP = {
  created: 0,
  accepted: 1,
  restaurant_confirmed: 1,
  restaurantconfirmed: 1,
  preparing: 2,
  ready_for_pickup: 3,
  readyforpickup: 3,
  ready: 3,
  picked_up: 4,
  pickedup: 4,
  delivering: 4,
  delivered: 5,
  completed: 5,
  canceled: 6,
  cancelled: 6,
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const fetchOrders = createAsyncThunk(
  'restaurantOrders/fetchOrders',
  async (_, { getState, rejectWithValue }) => {
    try {
      const allItems = [];
      const seenIds = new Set();

      // Priority 1: Fetch ALL orders without any status filter
      try {
        const allRes = await fetchRestaurantDeliveries({ page: 1, pageSize: 200 });
        const items = Array.isArray(allRes) ? allRes : (allRes?.items || allRes?.data || []);
        items.forEach(item => {
          const id = item.deliveryId || item.id;
          if (id && !seenIds.has(id)) {
            allItems.push(item);
            seenIds.add(id);
          }
        });
      } catch (e) {
        console.warn('⚠️ [OrdersSlice] Global fetch failed:', e.message);
      }

      // Priority 2: Fetch by specific active statuses JUST IN CASE the above missed something
      const activeStatuses = [0, 1, 2, 3, 4, 5, 6]; 
      for (const s of activeStatuses) {
        try {
          const res = await fetchRestaurantDeliveries({ page: 1, pageSize: 50, status: s });
          const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
          items.forEach(item => {
            const id = item.deliveryId || item.id;
            if (id && !seenIds.has(id)) {
              allItems.push(item);
              seenIds.add(id);
            }
          });
        } catch (e) {
          if (e.status === 401) break;
        }
      }

      let products = [];
      const state = getState();
      const existingCatalog = state.restaurantOrders?.catalog || [];
      
      if (existingCatalog.length === 0) {
        try {
          const productsRes = await fetchProducts({ page: 1, pageSize: 200 });
          products = productsRes.items || productsRes.data || (Array.isArray(productsRes) ? productsRes : []);
        } catch (e) {
          console.warn('⚠️ [OrdersSlice] Products fetch failed:', e.message);
        }
      } else {
        products = existingCatalog;
      }
      
      console.log(`📦 [OrdersSlice] Sync complete: ${allItems.length} orders`);
      return [allItems, products];
    } catch (err) { 
      return rejectWithValue(err.message || 'Failed to fetch orders'); 
    }
  }
);

export const acceptOrder = createAsyncThunk(
  'restaurantOrders/acceptOrder',
  async ({ orderId, prepTime }, { rejectWithValue, dispatch }) => {
    try {
      await acceptDelivery(orderId, { prepTime });
      dispatch(showToast({ message: '✅ Замовлення прийнято!', type: 'success' }));
      setTimeout(() => dispatch(fetchOrders()), 800);
      return { orderId };
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка при прийнятті замовлення', type: 'error' }));
      dispatch(fetchOrders());
      return rejectWithValue(err?.message);
    }
  }
);

export const rejectOrder = createAsyncThunk(
  'restaurantOrders/rejectOrder',
  async ({ orderId, reason }, { rejectWithValue, dispatch }) => {
    try {
      await cancelDelivery(orderId, reason);
      dispatch(showToast({ message: `❌ Відхилено: ${reason}`, type: 'warning' }));
      dispatch(fetchOrders());
      return { orderId };
    } catch (err) { dispatch(showToast({ message: err?.message || 'Помилка при відхиленні', type: 'error' })); return rejectWithValue(err?.message); }
  }
);

export const startPreparingOrder = createAsyncThunk(
  'restaurantOrders/startPreparingOrder',
  async ({ orderId }, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const item = state.restaurantOrders.items.find(o => (o.deliveryId || o.id) === orderId);
      if (!item) throw new Error('Order not found');

      const statusNum = Number(item.deliveryStatus ?? item.status ?? item.statusDelivery ?? -1);
      if (statusNum !== 1) {
        dispatch(showToast({ message: 'Неможливо почати готування: порядок не у статусі "Прийнято"', type: 'warning' }));
        return rejectWithValue('Invalid transition');
      }

      await startPreparing(orderId);

      dispatch(showToast({ message: '👨‍🍳 Починаємо готувати!', type: 'success' }));
      dispatch(fetchOrders());
      return { orderId };
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка при початку готування', type: 'error' }));
      return rejectWithValue(err?.message);
    }
  }
);


export const markOrderReady = createAsyncThunk(
  'restaurantOrders/markOrderReady',
  async ({ orderId }, { rejectWithValue, dispatch, getState }) => {
    try {
      const state = getState();
      const item = state.restaurantOrders.items.find(o => (o.deliveryId || o.id) === orderId);
      if (!item) throw new Error('Order not found');

      const statusNum = Number(item.deliveryStatus ?? item.status ?? item.statusDelivery ?? -1);
      if (statusNum !== 2) {
        dispatch(showToast({ message: 'Неможливо відмітити готовим: порядок не у статусі "Готується"', type: 'warning' }));
        return rejectWithValue('Invalid transition');
      }

      await markReady(orderId);

      dispatch(showToast({ message: '📦 Замовлення готове!', type: 'success' }));
      dispatch(fetchOrders());
      return { orderId };
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка при відмітці про готовність', type: 'error' }));
      return rejectWithValue(err?.message);
    }
  }
);

const normalizeItems = (raw) => {
  return (raw || []).map(item => {
    if (!item) return null;
    
    const id = item.deliveryId || item.id;
    
    let sNum = -1;
    if (item.deliveryStatus != null) sNum = Number(item.deliveryStatus);
    else if (item.status != null && !isNaN(Number(item.status))) sNum = Number(item.status);
    
    if (sNum === -1) {
      const sStr = String(item.statusDelivery || item.status || '').toLowerCase().trim();
      sNum = STATUS_MAP[sStr] ?? -1;
    }

    if (sNum === -1) sNum = 0;

    let sStr = (item.statusDelivery || '').toLowerCase().trim();
    if (sStr === 'restaurant_confirmed' || sStr === 'accepted' || sNum === 1) {
      sStr = 'accepted';
    } else if (sStr === 'cancelled') {
      sStr = 'canceled';
    } else {
      sStr = DELIVERY_STATUS[sNum] || sStr || 'created';
    }

    // Handle payment status (backend uses statusPayment in some objects, paymentStatus in others)
    const pStatus = (item.statusPayment || item.paymentStatus || '').toLowerCase().trim();

    return {
      ...item,
      id,
      deliveryId: id,
      deliveryStatus: sNum,
      statusDelivery: sStr,
      paymentStatus: pStatus,
      statusPayment: pStatus
    };
  }).filter(Boolean);
};


const restaurantOrdersSlice = createSlice({
  name: 'restaurantOrders',
  initialState: {
    items: [],
    catalog: [], // Full list of restaurant products with ingredients
    isLoading: false,
    error: null,
    notifications: [],
    restaurantInfo: null
  },
  reducers: {
    clearNotifications: (state) => {
      state.notifications = [];
    },
    markNotificationRead: (state, action) => {
      const id = action.payload;
      state.notifications = state.notifications.filter(n => n.id !== id);
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => { state.isLoading = true; })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;

        // Handle dual payload: [orders, products]
        const [rawOrders, products] = action.payload;
        const newItems = normalizeItems(rawOrders);
        state.catalog = products || [];

        // Change detection logic
        if (state.items.length > 0) {
          const prevItemsMap = new Map(state.items.map(i => [i.deliveryId || i.id, i]));
          const updates = [];

          newItems.forEach(item => {
            const id = item.deliveryId || item.id;
            const prev = prevItemsMap.get(id);

            if (!prev) {
              // New order detected! (only for statuses that matter to restaurant)
              if ([0, 1, 2].includes(item.deliveryStatus)) {
                updates.push({
                  id: `new-${id}-${Date.now()}`,
                  orderId: id,
                  type: 'NEW_ORDER',
                  message: `Нове замовлення #${id}`,
                  timestamp: new Date().toISOString()
                });
              }
            } else if (prev.deliveryStatus !== item.deliveryStatus) {
              // Status changed!
              updates.push({
                id: `status-${id}-${item.deliveryStatus}-${Date.now()}`,
                orderId: id,
                type: 'STATUS_CHANGE',
                message: `Замовлення #${id}: ${item.statusDelivery}`,
                timestamp: new Date().toISOString()
              });
            }
          });

          if (updates.length > 0) {
            state.notifications = [...updates, ...state.notifications].slice(0, 50);
          }
        }

        state.items = newItems;
      })
      .addCase(fetchOrders.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; })
      .addCase(fetchRestaurantInfo.fulfilled, (state, action) => {
        const data = action.payload;
        const info = Array.isArray(data) ? data[0] : data;
        state.restaurantInfo = info ? {
          ...info,
          imageUrl: resolveImageUrl(info.urlBase || info.imageUrl) || '',
          id: info.restaurantId || info.id
        } : null;
      });
  },
});

export const { clearNotifications, markNotificationRead } = restaurantOrdersSlice.actions;
export default restaurantOrdersSlice.reducer;