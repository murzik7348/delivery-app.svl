jest.mock('expo-print', () => ({}));
jest.mock('expo-sharing', () => ({}));
jest.mock('expo-file-system', () => ({}));
jest.mock('../src/api/client', () => ({
  getToken: jest.fn(),
  BASE_URL: 'https://api.test'
}));

import { calculateReceiptBreakdown } from '../services/ReceiptService';

describe('calculateReceiptBreakdown', () => {
  it('should calculate breakdown correctly for pickup orders', () => {
    const mockOrder = {
      address: 'Самовивіз (з ресторану)',
      totalPrice: 250,
      items: [
        { name: 'Піца', price: 100, quantity: 2 } // Subtotal = 200
      ]
    };
    
    const result = calculateReceiptBreakdown(mockOrder);
    expect(result.subtotal).toBe(200);
    expect(result.deliveryFee).toBe(0);
    expect(result.commissionFee).toBe(50); // Difference = 250 - 200 = 50
    expect(result.total).toBe(250);
  });

  it('should calculate breakdown correctly for delivery orders with commission', () => {
    const mockOrder = {
      address: 'вул. Шевченка, 10',
      totalPrice: 320,
      items: [
        { name: 'Бургер', price: 120, quantity: 2 } // Subtotal = 240
      ]
    };
    
    // Difference = 320 - 240 = 80 UAH.
    // 50 UAH goes to delivery fee, 30 UAH goes to commission.
    const result = calculateReceiptBreakdown(mockOrder);
    expect(result.subtotal).toBe(240);
    expect(result.deliveryFee).toBe(50);
    expect(result.commissionFee).toBe(30);
    expect(result.total).toBe(320);
  });

  it('should calculate breakdown correctly for delivery orders without commission', () => {
    const mockOrder = {
      address: 'вул. Шевченка, 10',
      totalPrice: 280,
      items: [
        { name: 'Бургер', price: 120, quantity: 2 } // Subtotal = 240
      ]
    };
    
    // Difference = 280 - 240 = 40 UAH.
    // 40 UAH goes to delivery fee, 0 UAH goes to commission.
    const result = calculateReceiptBreakdown(mockOrder);
    expect(result.subtotal).toBe(240);
    expect(result.deliveryFee).toBe(40);
    expect(result.commissionFee).toBe(0);
    expect(result.total).toBe(280);
  });
});
