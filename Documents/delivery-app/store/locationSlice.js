import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentLocation: null,
  savedAddresses: [],
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
    saveAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    // Функція видалення
    removeAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(
        (addr) => addr.id !== action.payload
      );
    },
  },
});

export const { setCurrentLocation, saveAddress, removeAddress } = locationSlice.actions;

export default locationSlice.reducer;