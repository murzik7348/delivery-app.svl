import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  isAuthenticated: false,
  user: null, 
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logoutUser: (state) => {
      state.isAuthenticated = false;
      state.user = null;
    },
    // 👇 ДОДАЄМО ЦЕ (Оновлення профілю)
    updateUser: (state, action) => {
      // Об'єднуємо старі дані з новими (наприклад, змінюємо тільки ім'я, а телефон залишаємо)
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    }
  },
});

export const { loginUser, logoutUser, updateUser } = authSlice.actions; // 👈 Не забудь експортувати updateUser
export default authSlice.reducer;