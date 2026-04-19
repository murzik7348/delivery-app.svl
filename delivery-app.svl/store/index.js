import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStore } from '../src/api/storeRef';

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
import catalogReducer from './catalogSlice';
import courierReducer from './courierSlice';

const appReducer = combineReducers({
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
  catalog: catalogReducer,
  courier: courierReducer,
});

const rootReducer = (state, action) => {
  // Clear all state on logout, except for language/locale settings
  if (action.type === 'auth/logoutUser') {
    const { language } = state || {};
    state = { language };
  }
  return appReducer(state, action);
};

const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: ['cart', 'auth', 'orders', 'favorites', 'location', 'language', 'courier'], // Only persist these slices
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Required for Redux Persist
    }),
});

// Register store reference so Axios interceptors can dispatch (e.g. logoutUser on 401)
setStore(store);

export const persistor = persistStore(store);