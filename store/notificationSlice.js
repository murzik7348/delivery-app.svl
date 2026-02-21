import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  unreadCount: 0,
};

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.items.unshift({
        id: Date.now().toString(),
        title: action.payload.title || 'Нове повідомлення',
        body: action.payload.body || '',
        date: new Date().toISOString(),
        read: false,
        data: action.payload.data || {},
      });
      state.unreadCount += 1;
    },
    markAsRead: (state) => {
      state.items.forEach(item => item.read = true);
      state.unreadCount = 0;
    },
    clearNotifications: (state) => {
      state.items = [];
      state.unreadCount = 0;
    }
  },
});

export const { addNotification, markAsRead, clearNotifications } = notificationSlice.actions;
export default notificationSlice.reducer;