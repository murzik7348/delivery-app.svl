import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  savedAddresses: [],
  currentLocation: null,
};

const locationSlice = createSlice({
  name: 'location',
  initialState,
  reducers: {
    addAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
    saveAddress: (state, action) => {
      state.savedAddresses.push(action.payload);
    },
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