import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import OrderService from '../services/OrderService';

// ── Async Thunk ───────────────────────────────────────────────────────────────
export const fetchOrders = createAsyncThunk(
  'orders/fetchOrders',
  async (_, { rejectWithValue }) => {
    try {
      return await OrderService.getActiveOrders();
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const initialState = {
  orders: [],
  isLoading: false,
  error: null,
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
          preparing: null,
          delivering: null,
          completed: null,
        },
      };
      state.orders.unshift(newOrder);
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status, timestamp } = action.payload;
      const order = state.orders.find((o) => o.id === orderId);
      if (order) {
        order.status = status;
        if (!order.statusTimestamps) order.statusTimestamps = {};
        order.statusTimestamps[status] = timestamp || Date.now();
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        // Merge remote orders with any locally created ones, avoiding duplicates
        const remoteIds = new Set((action.payload ?? []).map((o) => o.id?.toString()));
        const localOnly = state.orders.filter((o) => !remoteIds.has(o.id?.toString()));
        state.orders = [...(action.payload ?? []), ...localOnly];
      })
      .addCase(fetchOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload ?? 'Failed to load orders';
        // Keep existing orders in state
      });
  },
});

export const { addOrder, updateOrderStatus } = ordersSlice.actions;
export default ordersSlice.reducer;