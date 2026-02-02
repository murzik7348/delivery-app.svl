import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  list: [], // Спочатку історія порожня
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    addOrder: (state, action) => {
      // Додаємо нове замовлення на початок списку
      state.list = [action.payload, ...state.list];
    },
    clearHistory: (state) => {
        state.list = [];
    }
  }
});

export const { addOrder, clearHistory } = ordersSlice.actions;
export default ordersSlice.reducer;