import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action) => {
      state.orders.unshift(action.payload);
    },
    updateOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
      }
    }
  },
});

export const { addOrder, updateOrderStatus } = ordersSlice.actions;
export const submitOrder = (orderData) => async (dispatch) => {
  dispatch(addOrder(orderData));

  console.log("⏳ Замовлення створено. Чекаємо 10 секунд на кур'єра...");
  setTimeout(async () => {
    dispatch(updateOrderStatus({ orderId: orderData.id, status: 'courier' }));
    console.log("🛵 Кур'єр знайшовся!");
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Замовлення прийнято! 🛵",
        body: `Кур'єр вже прямує до закладу за вашим замовленням #${orderData.id.slice(-4)}`,
        sound: true,
        data: { url: '/orders' },
      },
      trigger: null,
    });

  }, 10000);
};

export default ordersSlice.reducer;