import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import cartReducer from './cartSlice';
import locationReducer from './locationSlice';
import favoritesReducer from './favoritesSlice';
import ordersReducer from './ordersSlice';
import notificationReducer from './notificationSlice';
import paymentReducer from './paymentSlice';
import languageReducer from './languageSlice';
import uiReducer from './uiSlice';
import aiReducer from './aiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer,
    location: locationReducer,
    favorites: favoritesReducer,
    orders: ordersReducer,
    notifications: notificationReducer,
    payment: paymentReducer,
    language: languageReducer,
    ui: uiReducer,
    ai: aiReducer,
  },
});