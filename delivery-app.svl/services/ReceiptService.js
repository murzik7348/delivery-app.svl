import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { getToken, BASE_URL } from '../src/api/client';

/**
 * Calculates order price breakdown dynamically based on total and items.
 */
export const calculateReceiptBreakdown = (order) => {
    const itemsSubtotal = (order.items || []).reduce((acc, item) => {
        const price = Number(item.price || item.productPrice || 0);
        const qty = Number(item.quantity || 1);
        return acc + (price * qty);
    }, 0);
    
    const total = Number(order.totalPrice ?? order.total ?? 0);
    
    // Check if it's a pickup order
    const isPickup = order.address === 'Самовивіз (з ресторану)' || 
                     (order.description && order.description.includes('[САМОВИВІЗ]')) ||
                     (order.note && order.note.includes('[САМОВИВІЗ]'));
    
    let deliveryFee = 0;
    if (!isPickup) {
        // Read delivery fee directly from order (which includes any applied coefficients)
        deliveryFee = Number(order.deliveryFee ?? order.delivery ?? order.deliveryFeeAmount ?? 0);
        // Fallback to difference if deliveryFee is not stored/available
        if (deliveryFee <= 0) {
            const difference = Math.max(0, total - itemsSubtotal);
            deliveryFee = difference > 50 ? 50 : difference;
        }
    }
    
    const commissionFee = Math.max(0, total - itemsSubtotal - deliveryFee);
    
    return {
        subtotal: itemsSubtotal,
        deliveryFee,
        commissionFee,
        total
    };
};

/**
 * ReceiptService handles PDF invoice creation.
 */
class ReceiptService {
    /**
     * Generates a PDF file of the receipt and triggers OS Share Sheet.
     * @param {Object} order - Normalized order object
     * @param {String} locale - 'uk' or 'en'
     */
    static async generateAndShareReceipt(order, locale = 'uk') {
        const orderNumber = (order.deliveryId || order.id || '').toString().padStart(6, '0');
        const isEn = locale === 'en';

        // 1. Try Option B: Download official PDF from backend
        try {
            const token = await getToken();
            const url = `${BASE_URL}/delivery/${order.id}/receipt`;
            const localUri = `${FileSystem.cacheDirectory}receipt_${orderNumber}.pdf`;

            console.log(`[ReceiptService] Attempting to download official receipt: ${url}`);

            const downloadResult = await FileSystem.downloadAsync(url, localUri, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            // If the backend has implemented the endpoint and returned a PDF
            if (downloadResult.status === 200 && downloadResult.mimeType === 'application/pdf') {
                console.log('[ReceiptService] Official backend receipt downloaded successfully ✓');
                if (await Sharing.isAvailableAsync()) {
                    await Sharing.shareAsync(localUri, {
                        mimeType: 'application/pdf',
                        dialogTitle: isEn ? `Receipt #${orderNumber}` : `Чек замовлення #${orderNumber}`,
                        UTI: 'com.adobe.pdf'
                    });
                    return;
                }
            } else {
                console.log(`[ReceiptService] Backend returned status ${downloadResult.status}. Falling back to client-side generation.`);
            }
        } catch (err) {
            console.warn('[ReceiptService] Backend receipt download failed, using client-side fallback:', err.message);
        }

        // 2. Option A Fallback: Client-side generation (if backend endpoint is not ready yet)
        try {
            const breakdown = calculateReceiptBreakdown(order);
            const dateStr = order.createdAt 
                ? new Date(order.createdAt).toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                : new Date().toLocaleDateString('uk-UA', { day: '2-digit', month: '2-digit', year: 'numeric' });
            
            // Generate items table HTML
            const itemsHtml = (order.items || []).map(item => {
                const name = item.productName || item.name || (isEn ? 'Item' : 'Товар');
                const qty = item.quantity || 1;
                const price = item.price || item.productPrice || 0;
                const totalLine = price * qty;
                return `
                    <tr class="item-row">
                        <td>${name}</td>
                        <td class="text-center">${qty}</td>
                        <td class="text-right">${price.toFixed(2)} ₴</td>
                        <td class="text-right">${totalLine.toFixed(2)} ₴</td>
                    </tr>
                `;
            }).join('');

            const htmlContent = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>${isEn ? 'Receipt' : 'Чек замовлення'}</title>
                    <style>
                        body {
                            font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                            color: #333333;
                            margin: 0;
                            padding: 40px;
                            line-height: 1.4;
                            background-color: #ffffff;
                        }
                        .receipt-box {
                            max-width: 800px;
                            margin: auto;
                            border: 1px solid #e2e8f0;
                            border-radius: 16px;
                            padding: 30px;
                            background: #ffffff;
                            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.02);
                        }
                        .header-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .logo {
                            font-size: 28px;
                            font-weight: bold;
                            color: #d946ef;
                            letter-spacing: 1px;
                        }
                        .invoice-title {
                            font-size: 20px;
                            text-align: right;
                            color: #718096;
                            font-weight: 500;
                        }
                        .info-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 40px;
                        }
                        .info-col {
                            width: 50%;
                            vertical-align: top;
                        }
                        .info-title {
                            font-size: 12px;
                            color: #a0aec0;
                            text-transform: uppercase;
                            margin-bottom: 5px;
                            font-weight: bold;
                        }
                        .info-text {
                            font-size: 15px;
                            color: #2d3748;
                            margin: 0;
                        }
                        .items-table {
                            width: 100%;
                            border-collapse: collapse;
                            margin-bottom: 30px;
                        }
                        .items-table th {
                            background-color: #f7fafc;
                            color: #718096;
                            font-size: 13px;
                            font-weight: bold;
                            text-transform: uppercase;
                            padding: 12px;
                            border-bottom: 2px solid #edf2f7;
                            text-align: left;
                        }
                        .items-table th.text-center { text-align: center; }
                        .items-table th.text-right { text-align: right; }
                        .item-row td {
                            padding: 14px 12px;
                            font-size: 15px;
                            border-bottom: 1px solid #edf2f7;
                            color: #2d3748;
                        }
                        .item-row td.text-center { text-align: center; }
                        .item-row td.text-right { text-align: right; }
                        .totals-table {
                            width: 350px;
                            margin-left: auto;
                            border-collapse: collapse;
                            margin-top: 20px;
                        }
                        .totals-row td {
                            padding: 8px 12px;
                            font-size: 14px;
                            color: #4a5568;
                        }
                        .totals-row.grand-total td {
                            font-size: 18px;
                            font-weight: bold;
                            color: #d946ef;
                            border-top: 2px solid #edf2f7;
                            padding-top: 15px;
                        }
                        .footer {
                            margin-top: 50px;
                            text-align: center;
                            font-size: 12px;
                            color: #a0aec0;
                            border-top: 1px solid #edf2f7;
                            padding-top: 20px;
                        }
                        .text-right { text-align: right; }
                    </style>
                </head>
                <body>
                    <div class="receipt-box">
                        <table class="header-table">
                            <tr>
                                <td class="logo">K&M Delivery</td>
                                <td class="invoice-title">${isEn ? 'RECEIPT' : 'ЧЕК ЗАМОВЛЕННЯ'}</td>
                            </tr>
                        </table>

                        <table class="info-table">
                            <tr>
                                <td class="info-col">
                                    <div class="info-title">${isEn ? 'Order Number' : 'Номер замовлення'}</div>
                                    <div class="info-text" style="font-weight: bold; font-size: 16px;">#${orderNumber}</div>
                                    <div style="height: 15px;"></div>
                                    <div class="info-title">${isEn ? 'Date' : 'Дата та час'}</div>
                                    <div class="info-text">${dateStr}</div>
                                </td>
                                <td class="info-col" style="text-align: right;">
                                    <div class="info-title">${isEn ? 'Delivery Address' : 'Адреса доставки'}</div>
                                    <div class="info-text">${order.address}</div>
                                    <div style="height: 15px;"></div>
                                    <div class="info-title">${isEn ? 'Payment Method' : 'Спосіб оплати'}</div>
                                    <div class="info-text">${order.paymentMethod || (isEn ? 'Card' : 'Картка')}</div>
                                </td>
                            </tr>
                        </table>

                        <table class="items-table">
                            <thead>
                                <tr>
                                    <th>${isEn ? 'Item' : 'Страва'}</th>
                                    <th class="text-center" style="width: 10%;">${isEn ? 'Qty' : 'К-сть'}</th>
                                    <th class="text-right" style="width: 20%;">${isEn ? 'Price' : 'Ціна'}</th>
                                    <th class="text-right" style="width: 20%;">${isEn ? 'Total' : 'Сума'}</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                            </tbody>
                        </table>

                        <table class="totals-table">
                            <tr class="totals-row">
                                <td>${isEn ? 'Subtotal' : 'Сума за страви'}:</td>
                                <td class="text-right">${breakdown.subtotal.toFixed(2)} ₴</td>
                            </tr>
                            <tr class="totals-row">
                                <td>${isEn ? 'Delivery Fee' : 'Вартість доставки'}:</td>
                                <td class="text-right">${breakdown.deliveryFee.toFixed(2)} ₴</td>
                            </tr>
                            <tr class="totals-row">
                                <td>${isEn ? 'Service Commission' : 'Сервісна комісія'}:</td>
                                <td class="text-right">${breakdown.commissionFee.toFixed(2)} ₴</td>
                            </tr>
                            <tr class="totals-row grand-total">
                                <td>${isEn ? 'Total Paid' : 'Всього сплачено'}:</td>
                                <td class="text-right">${breakdown.total.toFixed(2)} ₴</td>
                            </tr>
                        </table>

                        <div class="footer">
                            <p>${isEn ? 'Thank you for your order!' : 'Дякуємо, що обираєте K&M Delivery!'}</p>
                            <p>${isEn ? 'If you have any questions, please contact support.' : 'З будь-яких питань звертайтеся до нашої служби підтримки.'}</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            let Print;
            let Alert;
            try {
                Print = require('expo-print');
                Alert = require('react-native').Alert;
            } catch (e) {
                console.warn('[ReceiptService] expo-print or react-native module is not available');
            }

            if (!Print || !Print.printToFileAsync) {
                if (Alert) {
                    Alert.alert(
                        isEn ? 'Error' : 'Помилка',
                        isEn 
                            ? 'Printing and receipt generation is not supported on this device.'
                            : 'Друк та генерація чеку не підтримуються на цьому пристрої.'
                    );
                } else {
                    console.warn('[ReceiptService] Print or Alert is missing');
                }
                return;
            }

            const { uri } = await Print.printToFileAsync({ html: htmlContent });
            
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType: 'application/pdf',
                    dialogTitle: isEn ? `Receipt #${orderNumber}` : `Чек замовлення #${orderNumber}`,
                    UTI: 'com.adobe.pdf'
                });
            } else {
                throw new Error(isEn ? 'Sharing is not available on this device' : 'Поділитися файлом на цьому пристрої неможливо');
            }
        } catch (err) {
            console.error('[ReceiptService] Error generating fallback receipt:', err);
            throw err;
        }
    }
}

export default ReceiptService;
