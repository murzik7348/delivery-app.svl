import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  message: null,
  type: 'info', // 'info' | 'error' | 'success'
  id: 0,
};

const toastSlice = createSlice({
  name: 'toast',
  initialState,
  reducers: {
    showToast: (state, action) => {
      const { message, type = 'info' } = action.payload;
      state.message = message;
      state.type = type;
      state.id += 1;
    },
    hideToast: (state) => {
      state.message = null;
    },
  },
});

export const { showToast, hideToast } = toastSlice.actions;
export default toastSlice.reducer;
