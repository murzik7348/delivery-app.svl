import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    // UI state for common components
    isLoading: false,
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
    },
});

export const { setLoading } = uiSlice.actions;
export default uiSlice.reducer;
