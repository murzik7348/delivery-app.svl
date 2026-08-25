import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import OrderService from '../services/OrderService';
import { userConfirmDelivery } from '../src/api';

// ── Async Thunk ───────────────────────────────────────────────────────────────
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (params = {}, { getState, rejectWithValue }) => {
    const page = params.page ?? 1;
    const pageSize = params.pageSize ?? 20;
    const isBackground = params.isBackground ?? false;
    const isRefresh = params.isRefresh ?? false;
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
      
      return { newOrders, page, pageSize, isBackground, isRefresh };
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
  error: null,
  currentPage: 1,
  hasMore: true,
  maxPage: 1,
  hiddenOrderIds: [],
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
      const { orderId, status, statusDelivery, deliveryStatus, isConfirmedByUser, timestamp } = action.payload;
      const order = state.orders.find((o) => String(o.deliveryId || o.id) === String(orderId));
      if (order) {
        order.status = status;
        if (statusDelivery) order.statusDelivery = statusDelivery;
        if (deliveryStatus !== undefined) order.deliveryStatus = deliveryStatus;
        if (isConfirmedByUser !== undefined) order.isConfirmedByUser = isConfirmedByUser;
        if (!order.statusTimestamps) order.statusTimestamps = {};
        order.statusTimestamps[status] = timestamp || Date.now();
      }
    },
    clearOrders: (state) => {
      state.hiddenOrderIds = [];
      state.orders = [];
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state, action) => {
        const isBackground = action.meta.arg?.isBackground ?? false;
        if (!isBackground) {
          state.isLoading = true;
        }
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;

        const { newOrders = [], page, pageSize, isBackground } = action.payload;

        const getOrderId = (o) => (o.deliveryId || o.id)?.toString();

        // Preserve locally canceled status to prevent backend overwriting it
        const processedRemoteOrders = (newOrders ?? []).map(newOrder => {
          const oid = getOrderId(newOrder);
          const existing = state.orders.find(o => getOrderId(o) === oid);
          if (existing && (existing.status === 'canceled' || existing.status === 'cancelled')) {
            return { ...newOrder, status: 'canceled' };
          }
          return newOrder;
        });

        processedRemoteOrders.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.date || 0).getTime();
          const dateB = new Date(b.createdAt || b.date || 0).getTime();
          return dateB - dateA;
        });

        if (isBackground) {
          // Background polling: update active page items in place
          const existingMap = new Map(state.orders.map(o => [getOrderId(o), o]));
          for (const item of processedRemoteOrders) {
            const oid = getOrderId(item);
            if (existingMap.has(oid)) {
              existingMap.set(oid, { ...existingMap.get(oid), ...item });
            }
          }
          state.orders = Array.from(existingMap.values());
        } else {
          // Page mode (20 per page)
          state.orders = processedRemoteOrders;
          state.currentPage = page;
          state.hasMore = newOrders.length >= pageSize;
          const currentMax = Math.max(state.maxPage || 1, page + (newOrders.length >= pageSize ? 1 : 0));
          state.maxPage = currentMax;
        }
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
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
      .addCase(confirmOrder.fulfilled, (state, action) => {
        const id = action.payload?.id;
        const idx = state.orders.findIndex((o) => String(o.deliveryId || o.id) === String(id));
        if (idx !== -1) {
          state.orders[idx].status = 'delivered';
          state.orders[idx].statusDelivery = 'delivered';
          state.orders[idx].deliveryStatus = 5;
          state.orders[idx].isConfirmedByUser = true;
        }
      })
      .addCase('auth/logoutUser', () => initialState)
      .addCase('auth/loginUser', () => initialState);
  },
});

export const { addOrder, updateOrderStatus, clearOrders } = ordersSlice.actions;
export default ordersSlice.reducer;