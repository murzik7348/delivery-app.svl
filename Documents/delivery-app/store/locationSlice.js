import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  currentLocation: {
    latitude: 50.4501,
    longitude: 30.5234,
    addressName: 'Оберіть адресу 📍' 
  },
  savedAddresses: [
    // name: Це заголовок (Дім, Робота)
    // address: Це вулиця (Хрещатик, 1)
    { id: 1, name: 'Дім 🏠', address: 'вул. Хрещатик, 1', latitude: 50.45, longitude: 30.52 },
    { id: 2, name: 'Робота 💼', address: 'БЦ Парус', latitude: 50.44, longitude: 30.53 }
  ]
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    },
    saveAddress: (state, action) => {
      state.savedAddresses.unshift(action.payload);
    },
    // 👇 Функція видалення є тут
    deleteAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(addr => addr.id !== action.payload);
    }
  }
});

// 👇 ВАЖЛИВО: Перевір, чи є 'deleteAddress' у цьому списку!
export const { setCurrentLocation, saveAddress, deleteAddress } = locationSlice.actions;

export default locationSlice.reducer;