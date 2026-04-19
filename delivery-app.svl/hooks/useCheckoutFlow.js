import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import OrderService from '../services/OrderService';
import { getLiqPayCheckout } from '../src/api';
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

    // Global App State
    const { isAuthenticated, user } = useSelector(state => state.auth);
    const savedAddresses = useSelector(state => state.auth?.addresses || []);
    const paymentMethods = useSelector(state => state.payment?.methods || []);
    const selectedMethodId = useSelector(state => state.payment?.selectedMethodId);
    const { items: cartItems, totalAmount, discountAmount, deliveryFee, appliedPromo, orderNote, deliveryType } = useSelector((state) => state.cart);
    const locale = useSelector(state => state.language.locale);

    // Active Selection State
    const activeAddress = savedAddresses.length > 0 ? savedAddresses[0] : null;
    const activePayment = paymentMethods.find(m => m.id === selectedMethodId) ?? (paymentMethods.length > 0 ? paymentMethods[0] : null);

    /**
     * Entry point for the checkout button.
     * Validates all required fields before triggering the payment modal.
     */
    const initiateCheckout = (openAddressSheetCallback) => {
        console.log('[useCheckoutFlow] initiateCheckout called. Cart size:', cartItems.length);
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
        // Backend currently requires an addressId for ALL orders (even pickup)
        if (!activeAddress) {
            if (openAddressSheetCallback) openAddressSheetCallback();
            Alert.alert(
                locale === 'en' ? 'Address required' : 'Потрібна адреса',
                locale === 'en' ? 'Please add an address first (required by server).' : 'Будь ласка, додайте адресу (вимога сервера).'
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

        // 4. All checks passed. Trigger checkout directly.
        processActualCheckout();
    };

    /**
     * Submits the final order payload to the backend via OrderService.
     */
    const processActualCheckout = async () => {
        console.log('[STEP 1] processActualCheckout starting... isLoading = true;');
        setIsLoading(true);

        const orderPayload = {
            items: cartItems,
            total: totalAmount,
            discount: discountAmount,
            delivery: deliveryFee,
            promo: appliedPromo?.code ?? null,
            note: orderNote,
            type: deliveryType,
            address: activeAddress ?? { type: 'Pickup' },
            paymentInfo: activePayment,
            userId: user?.id || 'guest'
        };

        try {
            console.log('[STEP 2] Calling OrderService.createOrder with total:', totalAmount);
            const serverOrder = await OrderService.createOrder(orderPayload);
            const deliveryId = serverOrder.deliveryId || serverOrder.id;
            console.log('[STEP 3] Order created successfully. deliveryId:', deliveryId);

            dispatch(addOrder(serverOrder));
            dispatch(clearCart());
            console.log('[STEP 4] Cart cleared and order saved to local Redux store.');

            dispatch(showDynamicIsland({
                title: locale === 'en' ? 'Success!' : 'Успішно!',
                message: locale === 'en' ? 'Order placed 🎉' : 'Замовлення оформлено 🎉',
                icon: 'checkmark-circle',
                type: 'success',
            }));

            const isOnlinePayment = activePayment?.id === '1' || 
                                    activePayment?.id === '2' || 
                                    activePayment?.type?.toLowerCase().includes('apple') || 
                                    activePayment?.type?.toLowerCase().includes('card') || 
                                    activePayment?.type?.toLowerCase().includes('онлайн') || 
                                    activePayment?.type?.toLowerCase().includes('visa');
            console.log('[STEP 5] isOnlinePayment:', isOnlinePayment);

            let paymentFailedAlert = null;

            if (isOnlinePayment) {
                // serverDeliveryId is the real backend integer ID.
                // deliveryId may be a local ORD-timestamp fallback if the backend returned no ID.
                // We MUST only call LiqPay with a real numeric ID.
                const serverDeliveryId = serverOrder?.serverDeliveryId;
                console.log('[STEP 5b] serverDeliveryId (real backend ID):', serverDeliveryId);

                if (!serverDeliveryId) {
                    console.error('[ERROR: STEP 5] BACKEND DID NOT RETURN A VALID NUMERIC DELIVERY ID.');
                    console.error('Full server order object:', JSON.stringify(serverOrder, null, 2));
                    paymentFailedAlert = {
                        title: locale === 'en' ? 'Payment Error' : 'Помилка оплати',
                        msg: locale === 'en' ? 'Server returned invalid order ID.' : 'Сервер не повернув числовий ID замовлення (deliveryId).'
                    };
                } else {
                    try {
                        console.log('[STEP 6] Requesting LiqPay token for ID:', serverDeliveryId);
                        const liqPayResponse = await getLiqPayCheckout(serverDeliveryId);
                        console.log('[STEP 7] LiqPay config received.');
                        
                        if (liqPayResponse?.data && liqPayResponse?.signature) {
                            const checkoutUrl = `https://www.liqpay.ua/api/3/checkout?data=${liqPayResponse.data}&signature=${liqPayResponse.signature}`;
                            
                            console.log('[STEP 8] ATTEMPTING TO OPEN BROWSER FOR LIQPAY...');
                            try {
                                const browserResult = await WebBrowser.openBrowserAsync(checkoutUrl, {
                                    presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
                                    readerMode: false,
                                });
                                console.log('[STEP 9] Browser opened/closed natively, result:', browserResult);
                            } catch (browserError) {
                                console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                                console.error('[FATAL ERROR: BROWSER FAILED TO OPEN APPLE PAY]', browserError);
                                console.error('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
                                paymentFailedAlert = {
                                    title: 'Помилка відкриття Apple Pay (Браузер)',
                                    msg: browserError?.message || String(browserError)
                                };
                            }
                        } else {
                            console.error('[ERROR: STEP 7] Empty LiqPay Data from backend!', liqPayResponse);
                            paymentFailedAlert = {
                                title: locale === 'en' ? 'Invalid Payment Config' : 'Помилка платіжних даних',
                                msg: locale === 'en' ? 'The server returned an empty signature or data for LiqPay.' : 'Сервер повернув порожні дані від LiqPay (немає data/signature).'
                            };
                        }
                    } catch (paymentError) {
                        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                        console.error("[FATAL ERROR: PAYMENT INITIALIZATION FAILED]", paymentError);
                        console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
                        paymentFailedAlert = {
                            title: locale === 'en' ? 'Payment Gateway Error' : 'Помилка шлюзу оплати',
                            msg: (locale === 'en' ? 'Details: ' : 'Деталі: ') + (paymentError.message || String(paymentError))
                        };
                    }
                }
            }

            const navigateToNext = () => {
                if (deliveryId) {
                    router.replace(`/order-details?id=${deliveryId}`);
                } else {
                    router.replace('/orders');
                }
            };

            if (paymentFailedAlert) {
                Alert.alert(
                    paymentFailedAlert.title,
                    paymentFailedAlert.msg,
                    [{ text: "OK", onPress: navigateToNext }]
                );
            } else {
                navigateToNext();
            }

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
        isLoading
    };
}
