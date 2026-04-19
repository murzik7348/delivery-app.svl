import client from './client';

/**
 * Initiates a LiqPay checkout for a given delivery order.
 * Fetches the required data and signature to open the LiqPay widget.
 *
 * @param {number|string} deliveryId
 * @returns {Promise<{data: string, signature: string}>}
 */
export const getLiqPayCheckout = (deliveryId) => client.post(`/payments/${deliveryId}`);
