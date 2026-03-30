import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import ordersReducer from './slices/ordersSlice';
import restaurantOrdersReducer from './slices/restaurantOrdersSlice';
import catalogReducer from './slices/catalogSlice';
import usersReducer from './slices/usersSlice';
import settingsReducer from './slices/settingsSlice';
import toastReducer from './slices/toastSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    toast: toastReducer,
    orders: ordersReducer,
    restaurantOrders: restaurantOrdersReducer,
    catalog: catalogReducer,
    users: usersReducer,
    settings: settingsReducer,
  },
});

