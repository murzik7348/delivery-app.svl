import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import locationReducer from './locationSlice';
import favoritesReducer from './favoritesSlice';
import ordersReducer from './ordersSlice';
import notificationReducer from './notificationSlice';
import paymentReducer from './paymentSlice'; // 👈 1. Додали імпорт

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    location: locationReducer,
    favorites: favoritesReducer,
    orders: ordersReducer,
    notifications: notificationReducer,
    payment: paymentReducer, // 👈 2. Підключили до системи
  },
});