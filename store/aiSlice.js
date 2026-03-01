import { createSlice } from '@reduxjs/toolkit';

const initialState = {
    isOpen: false,
    messages: [
        {
            id: 'welcome_1',
            role: 'assistant',
            text: 'Привіт! Я твій AI-помічник. Чим можу допомогти? (Наприклад: "Де моє замовлення?", або "Що порадиш поїсти?")',
            timestamp: Date.now()
        }
    ],
    isTyping: false,
};

const aiSlice = createSlice({
    name: 'ai',
    initialState,
    reducers: {
        toggleAiChat: (state, action) => {
            // If payload is provided, explicitly set true/false
            if (typeof action.payload === 'boolean') {
                state.isOpen = action.payload;
            } else {
                state.isOpen = !state.isOpen;
            }
        },
        addMessage: (state, action) => {
            state.messages.push({
                id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                role: action.payload.role, // 'user' | 'assistant'
                text: action.payload.text,
                actionPayload: action.payload.actionPayload || null,
                timestamp: Date.now()
            });
        },
        setTyping: (state, action) => {
            state.isTyping = action.payload;
        },
        clearChat: (state) => {
            state.messages = initialState.messages;
        }
    },
});

export const { toggleAiChat, addMessage, setTyping, clearChat } = aiSlice.actions;
export default aiSlice.reducer;
