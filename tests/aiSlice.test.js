import aiReducer, { toggleAiChat, addMessage, setTyping, clearChat } from '../store/aiSlice';

describe('aiSlice Reducer', () => {
    let initialState;

    beforeEach(() => {
        initialState = aiReducer(undefined, { type: 'unknown' });
    });

    it('should handle initial state', () => {
        expect(initialState.isOpen).toEqual(false);
        expect(initialState.isTyping).toEqual(false);
        expect(initialState.messages.length).toEqual(1);
        expect(initialState.messages[0].role).toEqual('assistant');
    });

    it('should handle toggleAiChat (toggle)', () => {
        const nextState = aiReducer(initialState, toggleAiChat());
        expect(nextState.isOpen).toEqual(true);

        const state2 = aiReducer(nextState, toggleAiChat());
        expect(state2.isOpen).toEqual(false);
    });

    it('should handle toggleAiChat (explicit)', () => {
        const nextState = aiReducer(initialState, toggleAiChat(true));
        expect(nextState.isOpen).toEqual(true);

        const state2 = aiReducer(nextState, toggleAiChat(true));
        expect(state2.isOpen).toEqual(true); // Should stay true
    });

    it('should handle addMessage', () => {
        const payload = { role: 'user', text: 'Hello AI' };
        const nextState = aiReducer(initialState, addMessage(payload));
        expect(nextState.messages.length).toEqual(2);
        expect(nextState.messages[1].role).toEqual('user');
        expect(nextState.messages[1].text).toEqual('Hello AI');
        expect(nextState.messages[1].id).toBeDefined();
        expect(nextState.messages[1].timestamp).toBeDefined();
    });

    it('should handle setTyping', () => {
        const nextState = aiReducer(initialState, setTyping(true));
        expect(nextState.isTyping).toEqual(true);
    });

    it('should handle clearChat', () => {
        const stateWithMessage = aiReducer(initialState, addMessage({ role: 'user', text: 'Hi' }));
        expect(stateWithMessage.messages.length).toEqual(2);

        const clearedState = aiReducer(stateWithMessage, clearChat());
        expect(clearedState.messages.length).toEqual(1);
        expect(clearedState.messages[0].role).toEqual('assistant');
    });
});
