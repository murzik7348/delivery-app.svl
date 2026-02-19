import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  // Початкові лайки (ID ресторанів 1 і 2)
  ids: [1, 2], 
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite: (state, action) => {
      const id = action.payload;
      if (state.ids.includes(id)) {
        // Видаляємо
        state.ids = state.ids.filter(itemId => itemId !== id);
      } else {
        // Додаємо
        state.ids.push(id);
      }
    }
  }
});

export const { toggleFavorite } = favoritesSlice.actions;
export default favoritesSlice.reducer;