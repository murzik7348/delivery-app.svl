import { renderHook, act } from '@testing-library/react-hooks';
import useCheckoutFlow from '../hooks/useCheckoutFlow';
import { Alert } from 'react-native';
import * as reactRedux from 'react-redux';
import OrderService from '../services/OrderService';

// Mock Dependencies
jest.mock('react-native', () => ({
    Alert: { alert: jest.fn() },
    Platform: { OS: 'ios' }
}));
jest.mock('expo-router', () => ({
    useRouter: () => ({ push: jest.fn() })
}));
jest.mock('../services/OrderService', () => ({
    createOrder: jest.fn()
}));

// Mock Redux Hooks
jest.mock('react-redux', () => ({
    useDispatch: () => jest.fn(),
    useSelector: jest.fn(),
}));

describe('useCheckoutFlow Hook', () => {
    let mockState;

    beforeEach(() => {
        jest.clearAllMocks();

        // Base valid state
        mockState = {
            auth: {
                isAuthenticated: true,
                user: { id: 'u1' },
                addresses: [{ id: 'a1', type: 'Дім' }],
                paymentMethods: [{ id: 'pm1', type: 'Card' }]
            },
            cart: {
                items: [{ id: 'p1', price: 100 }],
                totalAmount: 100,
                deliveryType: 'delivery'
            },
            language: { locale: 'en' }
        };

        reactRedux.useSelector.mockImplementation((selector) => selector(mockState));
    });

    test('should reject checkout if cart is empty without alerting', () => {
        mockState.cart.items = [];
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).not.toHaveBeenCalled();
        expect(result.current.payModalVisible).toBe(false);
    });

    test('should alert and block checkout if user is not authenticated', () => {
        mockState.auth.isAuthenticated = false;
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Not signed in',
            'Please sign in to place an order.',
            expect.any(Array)
        );
        expect(result.current.payModalVisible).toBe(false);
    });

    test('should alert and block if delivery address is missing', () => {
        mockState.auth.addresses = []; // No addresses
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Address required',
            'Please add a delivery address first.'
        );
        expect(result.current.payModalVisible).toBe(false);
    });

    test('should alert and block if payment method is missing', () => {
        mockState.auth.paymentMethods = []; // No payment methods
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Payment method required',
            'Please select a payment method before checkout.',
            expect.any(Array)
        );
        expect(result.current.payModalVisible).toBe(false);
    });

    test('should open payment modal if all validations pass', () => {
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).not.toHaveBeenCalled();
        expect(result.current.payModalVisible).toBe(true);
    });
});
