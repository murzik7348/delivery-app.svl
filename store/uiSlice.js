import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    dynamicIsland: {
        visible: false,
        title: '',
        message: '',
        icon: 'checkmark-circle', // Назва іконки з Ionicons
        type: 'success', // 'success', 'error', 'info'
    },
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        showDynamicIsland: (state, action) => {
            // payload: { title, message, icon?, type? }
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
    },
});

export const { showDynamicIsland, hideDynamicIsland } = uiSlice.actions;
export default uiSlice.reducer;
