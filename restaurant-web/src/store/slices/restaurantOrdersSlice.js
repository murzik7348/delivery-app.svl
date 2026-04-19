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
  picked_up: 5,
  pickedup: 5,
  delivered: 6,
  canceled: 7,
  restaurant_confirmed: 1,
  cancelled: 7,
};

const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const fetchOrders = createAsyncThunk(
  'restaurantOrders/fetchOrders',
  async (_, { getState, rejectWithValue }) => {
    try {
      // 1. Fetch active statuses SEQUENTIALLY
      // This is crucial for Refresh Token stability. If the first request triggers a refresh,
      // subsequent requests will use the NEW token immediately instead of all hitting 401 at once.
      const activeStatuses = [0, 1, 2, 3, 4, 5]; 
      const allItems = [];
      const seenIds = new Set();
      
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
          console.warn(`⚠️ [OrdersSlice] Status ${s} fetch failed:`, e.message);
          // If we hit a 401 that couldn't be refreshed, we might want to stop the loop
          if (e.status === 401) break;
        }
      }

      // 2. Conditional product fetching (only if not loaded)
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
      
      console.log('📦 [OrdersSlice] Sequential fetch complete:', allItems.length, 'orders');
      return [allItems, products];
    } catch (err) { 
      console.error('❌ [OrdersSlice] Global fetch failed:', err);
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
  return (raw || []).map(item => {
    if (!item) return null;
    
    // 1. Determine ID
    const id = item.deliveryId || item.id;
    
    // 2. Determine Numeric Status
    let sNum = -1;
    if (item.deliveryStatus != null) sNum = Number(item.deliveryStatus);
    else if (item.status != null && !isNaN(Number(item.status))) sNum = Number(item.status);
    
    // 2.1 Fallback to string mapping if number is missing
    if (sNum === -1) {
      const sMap = {
        created: 0, paid: 2, accepted: 1, preparing: 3, 
        ready_for_pickup: 4, delivering: 5, delivered: 6, canceled: 7,
        restaurant_confirmed: 1, cancelled: 7
      };
      const sStr = String(item.statusDelivery || item.status || '').toLowerCase();
      sNum = sMap[sStr] ?? -1;
    }

    // 3. Check for Payed status (online payment sync)
    const pStatus = String(item.paymentStatus || item.statusPayment || '').toLowerCase().trim();
    const isPaidOnline = pStatus === 'success' || pStatus === 'subscribed';
    
    // If paid online but still in 'created' status, upgrade to Paid (2) for the Dashboard
    // IMPORTANT: If it's already 'accepted' (1) or higher, we keep that status so it shows on Kitchen/Delivery
    if (isPaidOnline && (sNum === 0 || sNum === -1)) {
      sNum = 2;
    }

    if (sNum === -1) sNum = 0;

    // 4. Standardize Status String
    let sStr = (item.statusDelivery || '').toLowerCase();
    if (sNum === 2) {
      sStr = 'paid';
    } else if (sStr === 'restaurant_confirmed' || sStr === 'accepted' || sNum === 1) {
      sStr = 'accepted';
    } else if (sStr === 'cancelled') {
      sStr = 'canceled';
    } else {
      sStr = DELIVERY_STATUS[sNum] || sStr || 'created';
    }

    // 5. Return complete cleaned object
    return {
      ...item,
      id,
      deliveryId: id,
      deliveryStatus: sNum,
      statusDelivery: sStr
    };
  }).filter(Boolean); // Remote any nulls just in case
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

export const { clearNotifications, markNotificationRead } = restaurantOrdersSlice.actions;
export default restaurantOrdersSlice.reducer;