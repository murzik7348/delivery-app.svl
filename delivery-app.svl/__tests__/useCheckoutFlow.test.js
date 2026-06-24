jest.mock('expo-web-browser', () => ({
    openBrowserAsync: jest.fn(),
    dismissBrowser: jest.fn(),
}));
jest.mock('expo-secure-store', () => ({
    setItemAsync: jest.fn(),
    getItemAsync: jest.fn(),
    deleteItemAsync: jest.fn(),
}));
jest.mock('expo-modules-core', () => ({
    EventEmitter: class {},
    NativeModulesProxy: {},
    requireNativeModule: () => ({}),
}));

import { renderHook, act } from '@testing-library/react-native';
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
    useRouter: () => ({
        push: jest.fn(),
        replace: jest.fn(),
    })
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
                addresses: [{ id: 'a1', type: 'Дім' }]
            },
            payment: {
                methods: [{ id: 'pm1', type: 'Cash' }],
                selectedMethodId: 'pm1'
            },
            cart: {
                items: [{ id: 'p1', price: 100 }],
                totalAmount: 100,
                deliveryType: 'delivery'
            },
            language: { locale: 'en' },
            location: { currentLocation: null }
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
    });

    test('should alert and block if delivery address is missing', () => {
        mockState.auth.addresses = []; // No addresses
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Address required',
            'Please add an address first (required by server).'
        );
    });

    test('should alert and block if payment method is missing', () => {
        mockState.payment.methods = []; // No payment methods
        mockState.payment.selectedMethodId = null;
        const { result } = renderHook(() => useCheckoutFlow());

        act(() => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).toHaveBeenCalledWith(
            'Payment method required',
            'Please select a payment method before checkout.',
            expect.any(Array)
        );
    });

    test('should process checkout if all validations pass', async () => {
        OrderService.createOrder.mockResolvedValueOnce({ id: 'o123', deliveryId: 'o123' });
        const { result } = renderHook(() => useCheckoutFlow());

        await act(async () => {
            result.current.initiateCheckout();
        });

        expect(Alert.alert).not.toHaveBeenCalled();
        expect(OrderService.createOrder).toHaveBeenCalled();
    });
});
