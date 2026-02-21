import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  selectedMethodId: '1',
  methods: [
    { id: '1', type: 'Apple Pay', icon: 'logo-apple', color: 'black', number: '' },
    { id: '3', type: 'Готівка', icon: 'cash', color: '#2ecc71', number: 'При отриманні' },
  ],
};

const paymentSlice = createSlice({
  name: 'payment',
  initialState,
  reducers: {
    setPaymentMethod: (state, action) => {
      state.selectedMethodId = action.payload;
    },
    addCard: (state, action) => {
      const { number, expiry } = action.payload;
      const newId = String(Date.now());
      state.methods.push({
        id: newId,
        type: 'Visa / MasterCard',
        icon: 'card',
        color: '#1a1f71',
        number: `${number}  ${expiry}`,
      });
      state.selectedMethodId = newId;
    },
    removeCard: (state, action) => {
      const id = action.payload;
      state.methods = state.methods.filter(m => m.id !== id);
      if (state.selectedMethodId === id) {
        state.selectedMethodId = state.methods[0]?.id ?? null;
      }
    },
  }
});

export const { setPaymentMethod, addCard, removeCard } = paymentSlice.actions;
export default paymentSlice.reducer;