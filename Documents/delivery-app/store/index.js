import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import favoritesReducer from './favoritesSlice';
import locationReducer from './locationSlice';
import ordersReducer from './ordersSlice';
import paymentReducer from './paymentSlice'; // 👈 1. Імпорт

export const store = configureStore({
  reducer: {
    location: locationReducer,
    auth: authReducer,
    cart: cartReducer,
    favorites: favoritesReducer,
    orders: ordersReducer,
    payment: paymentReducer, // 👈 2. Підключення
  },
});