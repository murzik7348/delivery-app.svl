import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  totalAmount: 0,
  discount: 0,      // Сума знижки (грн)
  appliedCode: null // Назва промокоду (для відображення)
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existingIndex = state.items.findIndex(item => item.product_id === action.payload.product_id);
      if (existingIndex >= 0) {
        state.items[existingIndex].quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      state.totalAmount = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      // При зміні кошика знижка може злетіти або перерахуватися (тут просто лишаємо як є)
    },
    removeFromCart: (state, action) => {
      const index = state.items.findIndex(item => item.product_id === action.payload);
      if (index >= 0) {
        if (state.items[index].quantity > 1) {
          state.items[index].quantity -= 1;
        } else {
          state.items.splice(index, 1);
        }
      }
      state.totalAmount = state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    },
    clearCart: (state) => {
      state.items = [];
      state.totalAmount = 0;
      state.discount = 0;
      state.appliedCode = null;
    },
    // 👇 Чисто фронтендська математика: застосувати цифри
    applyDiscount: (state, action) => {
        const { code, amount } = action.payload; 
        state.appliedCode = code;
        state.discount = amount; 
    }
  }
});

export const { addToCart, removeFromCart, clearCart, applyDiscount } = cartSlice.actions;
export default cartSlice.reducer;