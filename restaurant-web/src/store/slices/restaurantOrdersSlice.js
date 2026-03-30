import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchRestaurantDeliveries,
  acceptDelivery,
  cancelDelivery,
  startPreparing,
  markReady,
  fetchProducts,
} from '../../api/restaurant';
import { showToast } from './toastSlice';

// Backend Status Mapping (aligned with GEMINI.md)
// 0=created, 1=accepted, 2=preparing, 3=delivering, 4=delivered, 5=canceled
export const DELIVERY_STATUS = {
  0: 'created',
  2: 'paid',
  1: 'accepted',
  3: 'preparing',
  4: 'ready',
  5: 'delivering',
  6: 'delivered',
  7: 'canceled',
};

const STATUS_MAP = {
  created: 0,
  paid: 2,
  accepted: 1,
  preparing: 3,
  ready_for_pickup: 4,
  delivering: 5,
  delivered: 6,
  canceled: 7,
  restaurant_confirmed: 1,
  cancelled: 7,
};

export const fetchOrders = createAsyncThunk(
  'restaurantOrders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      // Fetch all relevant statuses: 0-6 (Canceled/7 might not be allowed for restaurant fetch)
      const statuses = [0, 1, 2, 3, 4, 5, 6]; 
      const [ordersRes, productsRes] = await Promise.all([
        Promise.all(statuses.map(s => fetchRestaurantDeliveries({ page: 1, pageSize: 50, status: s }))),
        // We also need the products to know the ingredients
        fetchProducts({ page: 1, pageSize: 200 }) 
      ]);

      const seenIds = new Set();
      ordersRes.forEach(res => {
        const items = Array.isArray(res) ? res : (res?.items || res?.data || []);
        items.forEach(item => {
          const id = item.deliveryId || item.id;
          if (id && !seenIds.has(id)) { 
            allItems.push(item); 
            seenIds.add(id); 
          }
        });
      });
      
      const products = productsRes.items || productsRes.data || (Array.isArray(productsRes) ? productsRes : []);
      
      console.log('📦 [OrdersSlice] Fetched total orders:', allItems.length, 'Products:', products.length);
      return [allItems, products];
    } catch (err) { 
      console.error('❌ [OrdersSlice] Fetch failed:', err);
      return rejectWithValue(err.message || 'Failed to fetch orders'); 
    }
  }
);

export const acceptOrder = createAsyncThunk(
  'restaurantOrders/acceptOrder',
  async ({ orderId }, { rejectWithValue, dispatch }) => {
    try {
      await acceptDelivery(orderId);
      dispatch(showToast({ message: '✅ Замовлення прийнято!', type: 'success' }));
      // Small delay to let backend database sync before fetching
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

      // Додаємо реальний виклик бекенду
      await startPreparing(orderId);
      
      dispatch(showToast({ message: '👨‍🍳 Починаємо готувати!', type: 'success' }));
      dispatch(fetchOrders()); // Одразу оновлюємо дані з сервера
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
      if (statusNum !== 3) {
        dispatch(showToast({ message: 'Неможливо відмітити готовим: порядок не у статусі "Готується"', type: 'warning' }));
        return rejectWithValue('Invalid transition');
      }

      // Додаємо реальний виклик бекенду
      await markReady(orderId);

      dispatch(showToast({ message: '📦 Замовлення готове!', type: 'success' }));
      dispatch(fetchOrders()); // Одразу оновлюємо дані з сервера
      return { orderId };
    } catch (err) {
      dispatch(showToast({ message: err?.message || 'Помилка при відмітці про готовність', type: 'error' }));
      return rejectWithValue(err?.message);
    }
  }
);

const normalizeItems = (raw) => {
  // Standardize status field and naming
  return (raw || []).map(item => {
    const mapped = { ...item };
    
    // 1. Try to get status from numeric fields
    let sNum = -1;
    if (item.deliveryStatus != null) sNum = Number(item.deliveryStatus);
    else if (item.status != null && !isNaN(Number(item.status))) sNum = Number(item.status);
    
    // 2. If numeric fields missing, try string mapping
    if (sNum === -1 && item.statusDelivery) {
      const s = String(item.statusDelivery).toLowerCase();
      sNum = STATUS_MAP[s] ?? -1;
    }
    
    // 3. Last resort: default to 0 (but only if we really have no clue)
    if (sNum === -1) sNum = 0;

    mapped.deliveryStatus = sNum;
    
    // Sync statusDelivery string (explicitly handle legacy names)
    let sStr = (item.statusDelivery || '').toLowerCase();
    if (sStr === 'restaurant_confirmed' || sStr === 'accepted') {
      mapped.deliveryStatus = 1;
      mapped.statusDelivery = 'accepted';
    } else if (sStr === 'cancelled') {
      mapped.deliveryStatus = 7;
      mapped.statusDelivery = 'canceled';
    } else {
      mapped.statusDelivery = DELIVERY_STATUS[mapped.deliveryStatus] || sStr;
    }

    return mapped;
  });
};

const restaurantOrdersSlice = createSlice({
  name: 'restaurantOrders',
  initialState: { 
    items: [], 
    catalog: [], // Full list of restaurant products with ingredients
    isLoading: false, 
    error: null,
    notifications: [] 
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
      .addCase(fetchOrders.rejected, (state, action) => { state.isLoading = false; state.error = action.payload; });
  },
});

export default restaurantOrdersSlice.reducer;