import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  orders: [],
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action) => {
      // Додаємо нове замовлення на початок списку
      state.orders.unshift(action.payload);
    },
    updateOrderStatus: (state, action) => {
      // 👇 Зміна статусу замовлення
      const { orderId, status } = action.payload;
      const order = state.orders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
      }
    }
  },
});

export const { addOrder, updateOrderStatus } = ordersSlice.actions;

// 🔥 РОЗУМНА ДІЯ (Thunk): Створює замовлення -> Чекає -> Міняє статус -> Шле пуш
export const submitOrder = (orderData) => async (dispatch) => {
  
  // 1. Створюємо замовлення одразу (статус "pending")
  dispatch(addOrder(orderData));

  console.log("⏳ Замовлення створено. Чекаємо 10 секунд на кур'єра...");

  // 2. Чекаємо 10 секунд (можеш змінити на 20000 для 20 сек)
  setTimeout(async () => {
    
    // 3. Міняємо статус на "courier"
    dispatch(updateOrderStatus({ orderId: orderData.id, status: 'courier' }));
    console.log("🛵 Кур'єр знайшовся!");

    // 4. Відправляємо локальне сповіщення
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Замовлення прийнято! 🛵",
        body: `Кур'єр вже прямує до закладу за вашим замовленням #${orderData.id.slice(-4)}`,
        sound: true,
        data: { url: '/orders' }, // Щоб при кліку відкрило історію
      },
      trigger: null, // null означає "відправити негайно"
    });

  }, 10000); // 👈 Час затримки в мілісекундах (10 сек для тесту, постав 20000 для реальності)
};

export default ordersSlice.reducer;