import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedMethodId: '1', // За замовчуванням - Apple Pay (ID 1)
  methods: [
    { id: '1', type: 'Apple Pay', icon: 'logo-apple', color: 'black', number: '' },
    { id: '2', type: 'Visa / MasterCard', icon: 'card', color: '#1a1f71', number: '•••• 4242' },
    { id: '3', type: 'Готівка', icon: 'cash', color: '#2ecc71', number: 'При отриманні' },
  ],
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setPaymentMethod: (state, action) => {
      state.selectedMethodId = action.payload; // Запам'ятовуємо вибір
    }
  }
});

export const { setPaymentMethod } = paymentSlice.actions;
export default paymentSlice.reducer;