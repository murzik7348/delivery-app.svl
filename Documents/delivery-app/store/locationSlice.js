import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  savedAddresses: [],
  currentLocation: null, //збереження поточної локації
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    // Збереження адреси в список
    addAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    // На всякий випадок дублюємо як saveAddress (бо в тебе в коді була така назва)
    saveAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    // Видалення адреси зі списку
    removeAddress: (state, action) => {
      state.savedAddresses = state.savedAddresses.filter(
        (address) => address.id !== action.payload
      );
    },
   
    setCurrentLocation: (state, action) => {
      state.currentLocation = action.payload;
    }
  },
});

export const { addAddress, saveAddress, removeAddress, setCurrentLocation } = locationSlice.actions;
export default locationSlice.reducer;