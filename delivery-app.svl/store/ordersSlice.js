import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import OrderService from '../services/OrderService';
import { userConfirmDelivery } from '../src/api';

// ── Async Thunk ───────────────────────────────────────────────────────────────
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params = {}, { getState, rejectWithValue }) => {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    try {
      const newOrders = await OrderService.getActiveOrders(page, pageSize);
      
      const state = getState();
      const oldOrders = state.orders?.orders || [];
      
      // Only do status change checks if we already had orders loaded
      if (oldOrders.length > 0) {
        newOrders.forEach(newOrder => {
          const newId = newOrder.deliveryId || newOrder.id;
          const oldOrder = oldOrders.find(o => String(o.deliveryId || o.id) === String(newId));
          
          if (oldOrder && oldOrder.status !== newOrder.status) {
            import('expo-notifications').then(Notifications => {
              // Status translations aligned with backend DeliveryStatus enum 0-6
              const statusTranslations = {
                 'created': 'Створено',
                 'accepted': 'Прийнято рестораном 🍽',
                 'preparing': 'Готується на кухні 🧑‍🍳',
                 'ready_for_pickup': 'Очікує курʼєра 🛍️',
                 'delivering': 'Курʼєр вже поспішає до Вас 🛵',
                 'delivered': 'Доставлено 🎉',
                 'canceled': 'Скасовано ❌'
              };
              
              const currentLang = state.language?.locale ?? 'uk';
              const text = currentLang === 'en' ? `Order status: ${newOrder.status}` : `Статус замовлення: ${statusTranslations[newOrder.status] || newOrder.status}`;
              
              Notifications.scheduleNotificationAsync({
                content: {
                  title: currentLang === 'en' ? 'Order Status Updated' : 'Статус замовлення змінено',
                  body: text,
                  data: { orderId: newId },
                },
                trigger: null,
              });
            }).catch(e => console.log('Notification schedule failed', e));
          }
        });
      }
      
      return { newOrders, page, pageSize };
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to load orders');
    }
  }
);

export const fetchOrderDetails = createAsyncThunk(
  'orders/fetchOrderDetails',
  async (id, { rejectWithValue }) => {
    try {
      const order = await OrderService.getOrderById(id);
      return order;
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to fetch order details');
    }
  }
);

export const confirmOrder = createAsyncThunk(
  'orders/confirmOrder',
  async (id, { rejectWithValue }) => {
    try {
      const response = await userConfirmDelivery(id);
      return { id, response };
    } catch (e) {
      return rejectWithValue(e.message || 'Failed to confirm order');
    }
  }
);

const initialState = {
  orders: [],
  isLoading: false,
  isMoreLoading: false,
  error: null,
  currentPage: 1,
  hasMore: true,
  hiddenOrderIds: [], // Track locally cleared order IDs
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action) => {
      const newOrder = {
        ...action.payload,
        status: action.payload.status ?? 'accepted',
        date: action.payload.date ?? new Date().toISOString(),
        statusTimestamps: {
          accepted: Date.now(),
          paid: null,
          preparing: null,
          ready_for_pickup: null,
          delivering: null,
          completed: null,
        },
      };
      state.orders.unshift(newOrder);
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status, timestamp } = action.payload;
      const order = state.orders.find((o) => String(o.deliveryId || o.id) === String(orderId));
      if (order) {
        order.status = status;
        if (!order.statusTimestamps) order.statusTimestamps = {};
        order.statusTimestamps[status] = timestamp || Date.now();
      }
    },
    clearOrders: (state) => {
      // Mark all currently fetched backend orders as hidden locally
      const remoteOrdersIds = state.orders
        .map(o => (o.deliveryId || o.id)?.toString())
        .filter(Boolean);

      state.hiddenOrderIds = [...(state.hiddenOrderIds || []), ...remoteOrdersIds];
      state.orders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state, action) => {
        const page = action.meta.arg?.page ?? 1;
        if (page === 1) {
          state.isLoading = true;
        } else {
          state.isMoreLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isMoreLoading = false;

        const { newOrders, page, pageSize } = action.payload;

        // Ensure hiddenOrderIds exists (for backward comp with persisted state)
        const hiddenIds = new Set(state.hiddenOrderIds || []);

        // Filter out orders that the user has cleared/hidden locally
        const visibleRemoteOrders = (newOrders ?? []).filter(o =>
          !hiddenIds.has((o.deliveryId || o.id)?.toString())
        );

        const getOrderId = (o) => (o.deliveryId || o.id)?.toString();

        // Preserve locally canceled status to prevent backend overwriting it
        const processedRemoteOrders = visibleRemoteOrders.map(newOrder => {
          const oid = getOrderId(newOrder);
          const existing = state.orders.find(o => getOrderId(o) === oid);
          if (existing && (existing.status === 'canceled' || existing.status === 'cancelled')) {
            return { ...newOrder, status: 'canceled' };
          }
          return newOrder;
        });

        if (page === 1) {
          // Replace/merge for the first page
          const remoteIds = new Set(processedRemoteOrders.map(getOrderId));
          const localOnly = state.orders.filter((o) => {
            const oid = getOrderId(o);
            return oid && oid !== 'undefined' && !remoteIds.has(oid) && !hiddenIds.has(oid);
          });
          const merged = [...processedRemoteOrders, ...localOnly];
          merged.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0).getTime();
            const dateB = new Date(b.createdAt || b.date || 0).getTime();
            return dateB - dateA;
          });
          state.orders = merged;
          state.currentPage = 1;
          state.hasMore = newOrders.length === pageSize;
        } else {
          // Append for subsequent pages
          const existingIds = new Set(state.orders.map(getOrderId));
          const uniqueNewOrders = processedRemoteOrders.filter(o => {
            const oid = getOrderId(o);
            return oid && !existingIds.has(oid);
          });
          state.orders = [...state.orders, ...uniqueNewOrders];
          // Keep sorted
          state.orders.sort((a, b) => {
            const dateA = new Date(a.createdAt || a.date || 0).getTime();
            const dateB = new Date(b.createdAt || b.date || 0).getTime();
            return dateB - dateA;
          });
          state.currentPage = page;
          state.hasMore = newOrders.length === pageSize;
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.isMoreLoading = false;
        state.error = action.payload ?? 'Failed to load orders';
      })
      .addCase(fetchOrderDetails.fulfilled, (state, action) => {
        const updated = action.payload;
        const id = updated?.deliveryId || updated?.id;
        const idx = state.orders.findIndex((o) => String(o.deliveryId || o.id) === String(id));
        if (idx !== -1) {
          const currentStatus = state.orders[idx].status;
          // Merge: keep local fields (timestamps etc.) and overwrite with server data
          state.orders[idx] = { ...state.orders[idx], ...updated };
          if (currentStatus === 'canceled' || currentStatus === 'cancelled') {
            state.orders[idx].status = 'canceled';
          }
        }
      })
      .addCase('auth/logoutUser', () => initialState)
      .addCase('auth/loginUser', () => initialState);
  },
});

export const { addOrder, updateOrderStatus, clearOrders } = ordersSlice.actions;
export default ordersSlice.reducer;