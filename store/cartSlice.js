import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  subtotal: 0,
  deliveryFee: 0,
  discountAmount: 0,
  totalAmount: 0,
  appliedPromo: null,
  deliveryType: 'delivery',
  orderNote: '',
};
const resolveId = (item) => {
  if (item.product_id !== undefined && item.product_id !== null) return item.product_id;
  if (item.id !== undefined && item.id !== null) return item.id;
  return null;
};
const calculateTotals = (state) => {
  state.subtotal = state.items.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0
  );
  if (state.deliveryType === 'delivery' && state.subtotal > 0) {
    state.deliveryFee = state.subtotal >= 1000 ? 0 : 50;
  } else {
    state.deliveryFee = 0;
  }
  if (state.appliedPromo && state.subtotal > 0) {
    const promo = state.appliedPromo;
    if (promo.type === 'buy2half') {
      // Кожен другий товар отримує знижку percent%
      // 2 шт → 1 зі знижкою, 3 шт → 1, 4 шт → 2, тощо
      const promoItem = state.items.find(i => resolveId(i) === promo.productId);
      if (promoItem) {
        const discountedCount = Math.floor(promoItem.quantity / 2);
        state.discountAmount = discountedCount * parseFloat(promoItem.price) * (promo.percent / 100);
      } else {
        state.discountAmount = 0;
      }
    } else if (promo.type === 'percent') {
      state.discountAmount = Math.round((state.subtotal * promo.discount) / 100);
    } else if (promo.type === 'fixed') {
      state.discountAmount = promo.discount;
    } else {
      state.discountAmount = 0;
    }
  } else {
    state.discountAmount = 0;
  }
  state.totalAmount = Math.max(0, state.subtotal + state.deliveryFee - state.discountAmount);
};


const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const incomingId = resolveId(action.payload);

      if (incomingId === null) {
        console.warn('[cartSlice] addToCart: payload has no id or product_id', action.payload);
        return;
      }
      const existingItem = state.items.find((item) => resolveId(item) === incomingId);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }

      calculateTotals(state);
    },
    removeFromCart: (state, action) => {
      state.items = state.items.filter((item) => resolveId(item) !== action.payload);
      calculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find((item) => resolveId(item) === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
      calculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.totalAmount = 0;
      state.discountAmount = 0;
      state.deliveryFee = 0;
      state.appliedPromo = null;
      state.orderNote = '';
    },
    applyDiscount: (state, action) => {
      state.appliedPromo = action.payload;
      calculateTotals(state);
    },
    removeDiscount: (state) => {
      state.appliedPromo = null;
      calculateTotals(state);
    },
    setDeliveryType: (state, action) => {
      state.deliveryType = action.payload;
      calculateTotals(state);
    },
    setOrderNote: (state, action) => {
      state.orderNote = action.payload;
    },
  },
});

export const {
  addToCart,
  removeFromCart,
  updateQuantity,
  clearCart,
  applyDiscount,
  removeDiscount,
  setDeliveryType,
  setOrderNote,
} = cartSlice.actions;

export default cartSlice.reducer;