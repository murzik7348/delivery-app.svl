import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    // UI state for common components
    isLoading: false,
    theme: null, // 'light' or 'dark' (null defaults to system)
    dynamicIsland: {
        visible: false,
        title: '',
        message: '',
        icon: 'checkmark-circle', // Назва іконки з Ionicons
        type: 'success', // 'success', 'error', 'info'
    },
    isOffline: false,
    bottomBarVisible: true,
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
        showDynamicIsland: (state, action) => {
            state.dynamicIsland = {
                visible: true,
                title: action.payload.title || '',
                message: action.payload.message || '',
                icon: action.payload.icon || 'checkmark-circle',
                type: action.payload.type || 'success',
            };
        },
        hideDynamicIsland: (state) => {
            state.dynamicIsland.visible = false;
        },
        setOffline: (state, action) => {
            state.isOffline = action.payload;
        },
        setBottomBarVisible: (state, action) => {
            state.bottomBarVisible = action.payload;
        },
    },
});

export const { setLoading, setTheme, showDynamicIsland, hideDynamicIsland, setOffline, setBottomBarVisible } = uiSlice.actions;
export default uiSlice.reducer;
