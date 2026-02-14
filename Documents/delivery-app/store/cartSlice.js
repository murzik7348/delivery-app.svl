import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  subtotal: 0,        // Сума без знижки
  totalAmount: 0,     // Сума до оплати (після знижки)
  discountAmount: 0,  // Скільки гривень зекономили
  appliedPromo: null  // Об'єкт застосованого промокоду
};

// Розумна функція, яка перераховує всі гроші
const calculateTotals = (state) => {
  // 1. Рахуємо вартість усіх товарів
  const subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  state.subtotal = subtotal;

  // 2. Рахуємо знижку
  if (state.appliedPromo && subtotal > 0) {
    if (state.appliedPromo.type === 'percent') {
      state.discountAmount = (subtotal * state.appliedPromo.discount) / 100;
    } else if (state.appliedPromo.type === 'fixed') {
      state.discountAmount = state.appliedPromo.discount;
    } else {
      state.discountAmount = 0; // Наприклад, для 'delivery' знижка на товари 0
    }
  } else {
    state.discountAmount = 0;
  }

  // 3. Віднімаємо знижку від загальної суми (щоб не було мінуса)
  const finalTotal = subtotal - state.discountAmount;
  state.totalAmount = finalTotal < 0 ? 0 : finalTotal;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      // Підтримка id або product_id
      const existingItem = state.items.find(item => item.id === action.payload.id || item.product_id === action.payload.product_id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      calculateTotals(state); // Перераховуємо
    },
    removeFromCart: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload || item.product_id === action.payload);
      if (index >= 0) {
        state.items.splice(index, 1);
      }
      calculateTotals(state); // Перераховуємо
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id || item.product_id === id);
      if (item) {
        item.quantity = quantity;
      }
      calculateTotals(state); // Перераховуємо
    },
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.totalAmount = 0;
      state.discountAmount = 0;
      state.appliedPromo = null;
    },
    // 👇 Дві функції для управління знижками
    applyDiscount: (state, action) => {
      state.appliedPromo = action.payload; 
      calculateTotals(state);
    },
    removeDiscount: (state) => {
      state.appliedPromo = null;
      calculateTotals(state);
    }
  }
});

export const { addToCart, removeFromCart, updateQuantity, clearCart, applyDiscount, removeDiscount } = cartSlice.actions;
export default cartSlice.reducer;