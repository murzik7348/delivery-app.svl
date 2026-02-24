import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action) => {
      const newOrder = {
        ...action.payload,
        status: 'accepted',
        statusTimestamps: {
          accepted: Date.now(),
          preparing: null,
          delivering: null,
          completed: null
        }
      };
      state.orders.unshift(newOrder);
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status, timestamp } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
        if (!order.statusTimestamps) {
          order.statusTimestamps = {};
        }
        order.statusTimestamps[status] = timestamp || Date.now();
      }
    }
  },
});

export const { addOrder, updateOrderStatus } = ordersSlice.actions;

export default ordersSlice.reducer;