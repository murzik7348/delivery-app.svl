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

// ─── Safe ID resolver ──────────────────────────────────────────────────────────
// CRITICAL FIX: Never use (a.id === b.id) when both can be undefined.
//   undefined === undefined  →  true  → WRONG ITEM matched every time.
// Always resolve to a concrete value first.
const resolveId = (item) => {
  if (item.product_id !== undefined && item.product_id !== null) return item.product_id;
  if (item.id        !== undefined && item.id        !== null) return item.id;
  return null;
};

// ─── Totals calculator ─────────────────────────────────────────────────────────
const calculateTotals = (state) => {
  // 1. Subtotal (sum of items)
  state.subtotal = state.items.reduce(
    (sum, item) => sum + (parseFloat(item.price) || 0) * (item.quantity || 1),
    0
  );

  // 2. Delivery fee
  if (state.deliveryType === 'delivery' && state.subtotal > 0) {
    state.deliveryFee = state.subtotal >= 1000 ? 0 : 50;
  } else {
    state.deliveryFee = 0;
  }

  // 3. Discount
  if (state.appliedPromo && state.subtotal > 0) {
    if (state.appliedPromo.type === 'percent') {
      state.discountAmount = Math.round((state.subtotal * state.appliedPromo.discount) / 100);
    } else if (state.appliedPromo.type === 'fixed') {
      state.discountAmount = state.appliedPromo.discount;
    } else {
      state.discountAmount = 0;
    }
  } else {
    state.discountAmount = 0;
  }

  // 4. Total (never below 0)
  state.totalAmount = Math.max(0, state.subtotal + state.deliveryFee - state.discountAmount);
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    // ── addToCart ──────────────────────────────────────────────────────────────
    addToCart: (state, action) => {
      const incomingId = resolveId(action.payload);

      if (incomingId === null) {
        // Guard: skip malformed payloads
        console.warn('[cartSlice] addToCart: payload has no id or product_id', action.payload);
        return;
      }

      // FIXED: compare resolved IDs, never raw .id (which can be undefined for both sides)
      const existingItem = state.items.find((item) => resolveId(item) === incomingId);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        // Spread payload but always override quantity to 1 for fresh adds
        state.items.push({ ...action.payload, quantity: 1 });
      }

      calculateTotals(state);
    },

    // ── removeFromCart ─────────────────────────────────────────────────────────
    removeFromCart: (state, action) => {
      // payload = the resolved ID value (a number or string)
      state.items = state.items.filter((item) => resolveId(item) !== action.payload);
      calculateTotals(state);
    },

    // ── updateQuantity ─────────────────────────────────────────────────────────
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      // FIXED: same resolveId comparison instead of item.id === id (undefined trap)
      const item = state.items.find((item) => resolveId(item) === id);
      if (item) {
        item.quantity = Math.max(1, quantity);
      }
      calculateTotals(state);
    },

    // ── clearCart ──────────────────────────────────────────────────────────────
    clearCart: (state) => {
      state.items        = [];
      state.subtotal     = 0;
      state.totalAmount  = 0;
      state.discountAmount = 0;
      state.deliveryFee  = 0;
      state.appliedPromo = null;
      state.orderNote    = '';
    },

    // ── applyDiscount ──────────────────────────────────────────────────────────
    applyDiscount: (state, action) => {
      state.appliedPromo = action.payload;
      calculateTotals(state);
    },

    // ── removeDiscount ─────────────────────────────────────────────────────────
    removeDiscount: (state) => {
      state.appliedPromo = null;
      calculateTotals(state);
    },

    // ── setDeliveryType ────────────────────────────────────────────────────────
    setDeliveryType: (state, action) => {
      state.deliveryType = action.payload;
      calculateTotals(state);
    },

    // ── setOrderNote ───────────────────────────────────────────────────────────
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