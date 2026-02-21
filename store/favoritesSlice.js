import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  ids: [1, 2],
  productIds: [],
};

const favoritesSlice = createSlice({
  name: 'favorites',
  initialState,
  reducers: {
    toggleFavorite: (state, action) => {
      const id = action.payload;
      if (state.ids.includes(id)) {
        state.ids = state.ids.filter(itemId => itemId !== id);
      } else {
        state.ids.push(id);
      }
    },
    toggleFavoriteProduct: (state, action) => {
      const id = action.payload;
      if (state.productIds.includes(id)) {
        state.productIds = state.productIds.filter(pid => pid !== id);
      } else {
        state.productIds.push(id);
      }
    },
  }
});

export const { toggleFavorite, toggleFavoriteProduct } = favoritesSlice.actions;
export default favoritesSlice.reducer;