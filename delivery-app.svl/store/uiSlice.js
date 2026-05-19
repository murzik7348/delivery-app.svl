import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    // UI state for common components
    isLoading: false,
    theme: null, // 'light' or 'dark' (null defaults to system)
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        setLoading: (state, action) => {
            state.isLoading = action.payload;
        },
        setTheme: (state, action) => {
            state.theme = action.payload;
        },
    },
});

export const { setLoading, setTheme } = uiSlice.actions;
export default uiSlice.reducer;
