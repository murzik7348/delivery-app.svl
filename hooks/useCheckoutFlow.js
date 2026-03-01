import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import OrderService from '../services/OrderService';
import { addOrder } from '../store/ordersSlice';
import { clearCart } from '../store/cartSlice';
import { showDynamicIsland } from '../store/uiSlice';

/**
 * useCheckoutFlow manages the complex state and validation rules for submitting an order.
 * It removes all if/else logic from the Cart UI component.
 */
export default function useCheckoutFlow() {
    const dispatch = useDispatch();
    const router = useRouter();

    const [isLoading, setIsLoading] = useState(false);
    const [payModalVisible, setPayModalVisible] = useState(false);

    // Global App State
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const savedAddresses = useSelector(state => state.location?.savedAddresses || []);
    const paymentMethods = useSelector(state => state.payment?.methods || []);
    const { items: cartItems, totalAmount, discountAmount, deliveryFee, appliedPromo, orderNote, deliveryType } = useSelector((state) => state.cart);
    const locale = useSelector(state => state.language.locale);

    // Active Selection State (Assuming the first address/payment is active for simplicity in this hook. 
    // In a fuller app, cartSlice or userSlice would track the explicit selected ID).
    const activeAddress = savedAddresses.length > 0 ? savedAddresses[0] : null;
    const activePayment = paymentMethods.length > 0 ? paymentMethods[0] : null;

    /**
     * Entry point for the checkout button.
     * Validates all required fields before triggering the payment modal.
     */
    const initiateCheckout = (openAddressSheetCallback) => {
        if (cartItems.length === 0) return;

        // 1. Validate Authentication
        if (!isAuthenticated) {
            Alert.alert(
                locale === 'en' ? 'Not signed in' : 'Вхід не виконано',
                locale === 'en' ? 'Please sign in to place an order.' : 'Будь ласка, увійдіть у профіль.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Login', onPress: () => router.push('/(auth)/login') },
                ]
            );
            return;
        }

        // 2. Validate Delivery Address
        if (deliveryType === 'delivery' && !activeAddress) {
            if (openAddressSheetCallback) openAddressSheetCallback();
            Alert.alert(
                locale === 'en' ? 'Address required' : 'Потрібна адреса',
                locale === 'en' ? 'Please add a delivery address first.' : 'Будь ласка, додайте адресу доставки.'
            );
            return;
        }

        // 3. Validate Payment Method
        if (!activePayment) {
            Alert.alert(
                locale === 'en' ? 'Payment method required' : 'Потрібен метод оплати',
                locale === 'en' ? 'Please select a payment method before checkout.' : 'Оберіть спосіб оплати.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Select', onPress: () => router.push('/payment') }
                ]
            );
            return;
        }

        // 4. All checks passed. Trigger Apple Pay / Payment UI.
        setPayModalVisible(true);
    };

    /**
     * Submits the final order payload to the backend via OrderService.
     */
    const processActualCheckout = async () => {
        setPayModalVisible(false);
        setIsLoading(true);

        const orderPayload = {
            items: cartItems,
            total: totalAmount,
            discount: discountAmount,
            delivery: deliveryFee,
            promo: appliedPromo?.code ?? null,
            note: orderNote,
            type: deliveryType,
            address: deliveryType === 'delivery' ? activeAddress : { type: 'Pickup' },
            paymentInfo: activePayment,
            userId: user?.id || 'guest'
        };

        try {
            // Call isolated service layer
            const serverOrder = await OrderService.createOrder(orderPayload);

            // Update local state on success
            dispatch(addOrder(serverOrder));
            dispatch(clearCart());

            dispatch(showDynamicIsland({
                title: locale === 'en' ? 'Success!' : 'Успішно!',
                message: locale === 'en' ? 'Order placed 🎉' : 'Замовлення оформлено 🎉',
                icon: 'checkmark-circle',
                type: 'success',
            }));

            // Launch Native iOS Live Activity via Native Module/Plugin
            // This will be handled in useLiveActivitySync hook independently triggered by Redux state change!

        } catch (error) {
            console.error("Checkout failed:", error);
            Alert.alert("Checkout Failed", error.message || "An error occurred.");
        } finally {
            setIsLoading(false);
        }
    };

    return {
        initiateCheckout,
        processActualCheckout,
        payModalVisible,
        setPayModalVisible,
        isLoading
    };
}
