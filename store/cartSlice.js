import { createSelector, createSlice } from '@reduxjs/toolkit';

// ─── Business Rule Constants ─────────────────────────────────────────────────
export const MIN_ORDER_AMOUNT = 200;        // UAH – minimum to enable checkout
export const FREE_DELIVERY_THRESHOLD = 899; // UAH – subtotal that unlocks free delivery
export const BASE_DELIVERY_FEE = 50;        // UAH – flat delivery fee below threshold

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Resolve the base product ID from any item shape the app uses. */
const resolveId = (item) => {
  if (item?.product_id !== undefined && item.product_id !== null) return item.product_id;
  if (item?.id !== undefined && item.id !== null) return item.id;
  return null;
};

/**
 * Build a stable, unique cart key from a product + its selected modifiers.
 * Two orders of same product with different add-ons become separate line items.
 * Key format: "<productId>|<sortedModifierPairs>"
 */
export const makeCartKey = (item) => {
  const id = resolveId(item);
  const mods = item?.modifiers;
  if (!mods || mods.length === 0) return `${id}|`;

  const sorted = [...mods]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .map((m) => `${m.id}:${m.qty ?? 1}`)
    .join('_');
  return `${id}|${sorted}`;
};

/** Parse any value safely — never returns NaN. */
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

/**
 * Calculate the effective unit price for a line item: base price + sum of modifier prices.
 * Modifier shape: { id, name, price, qty? }
 */
const lineUnitPrice = (item) => {
  const base = safeNum(item.price);
  const addOns = (item.modifiers ?? []).reduce(
    (sum, m) => sum + safeNum(m.price) * (m.qty ?? 1),
    0
  );
  return base + addOns;
};

/** Recalculate derived totals in-place (mutates Immer draft). */
const calculateTotals = (state) => {
  state.subtotal = state.items.reduce(
    (sum, item) => sum + lineUnitPrice(item) * (item.quantity || 1),
    0
  );

  if (state.deliveryType === 'delivery' && state.subtotal > 0) {
    state.deliveryFee = state.subtotal >= FREE_DELIVERY_THRESHOLD ? 0 : BASE_DELIVERY_FEE;
  } else {
    state.deliveryFee = 0;
  }

  if (state.appliedPromo && state.subtotal > 0) {
    const promo = state.appliedPromo;
    if (promo.type === 'buy2half') {
      const promoItem = state.items.find((i) => resolveId(i) === promo.productId);
      if (promoItem) {
        const discountedCount = Math.floor(promoItem.quantity / 2);
        state.discountAmount =
          discountedCount * lineUnitPrice(promoItem) * (promo.percent / 100);
      } else {
        state.discountAmount = 0;
      }
    } else if (promo.type === 'percent') {
      state.discountAmount = Math.round((state.subtotal * promo.discount) / 100);
    } else if (promo.type === 'fixed') {
      state.discountAmount = Math.min(promo.discount, state.subtotal);
    } else {
      state.discountAmount = 0;
    }
  } else {
    state.discountAmount = 0;
  }

  state.totalAmount = Math.max(
    0,
    state.subtotal + state.deliveryFee - state.discountAmount
  );
};

// ─── Initial State ────────────────────────────────────────────────────────────
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

// ─── Slice ────────────────────────────────────────────────────────────────────
const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    /**
     * Add a product to the cart.
     * Items are grouped by cartKey (product id + selected modifiers).
     */
    addToCart: (state, action) => {
      const incomingId = resolveId(action.payload);
      if (incomingId === null) {
        console.warn('[cartSlice] addToCart: payload has no id or product_id', action.payload);
        return;
      }

      const cartKey = makeCartKey(action.payload);
      const existingItem = state.items.find((item) => item.cartKey === cartKey);
      const safePrice = safeNum(action.payload.price);

      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({
          ...action.payload,
          price: safePrice,
          modifiers: action.payload.modifiers ?? [],
          quantity: 1,
          cartKey,
        });
      }

      calculateTotals(state);
    },

    /**
     * Decrement a line item by 1. Stops at quantity=1.
     * The UI must show a confirmation Alert before dispatching removeItem.
     */
    decrementItem: (state, action) => {
      const cartKey = action.payload;
      const item = state.items.find((i) => i.cartKey === cartKey);
      if (item && item.quantity > 1) {
        item.quantity -= 1;
        calculateTotals(state);
      }
    },

    /** Remove a line item entirely by its cartKey. */
    removeItem: (state, action) => {
      const cartKey = action.payload;
      state.items = state.items.filter((item) => item.cartKey !== cartKey);
      calculateTotals(state);
    },

    /** Set an absolute quantity for a line item. Enforces a minimum of 1. */
    updateQuantity: (state, action) => {
      const { cartKey, quantity } = action.payload;
      const item = state.items.find((i) => i.cartKey === cartKey);
      const safeQuantity = parseInt(quantity, 10);

      if (item && !isNaN(safeQuantity)) {
        item.quantity = Math.max(1, safeQuantity);
        calculateTotals(state);
      }
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

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  addToCart,
  decrementItem,
  removeItem,
  updateQuantity,
  clearCart,
  applyDiscount,
  removeDiscount,
  setDeliveryType,
  setOrderNote,
} = cartSlice.actions;

// Backwards-compat alias so existing call-sites don't immediately break
export const removeFromCart = removeItem;

// ─── Selectors ────────────────────────────────────────────────────────────────
const selectCartState = (state) => state.cart;

export const selectCartItems = (state) => state.cart.items;

/**
 * Memoised summary selector.
 * Returns: subtotal, discountAmount, deliveryFee, total, originalTotal,
 *          isMinOrderMet, amountToFreeDelivery, freeDeliveryProgress
 */
export const selectCartSummary = createSelector(selectCartState, (cart) => {
  const subtotal = safeNum(cart.subtotal);
  const discountAmount = safeNum(cart.discountAmount);
  const deliveryFee = cart.deliveryType === 'delivery' ? safeNum(cart.deliveryFee) : 0;
  const total = safeNum(cart.totalAmount);
  const originalTotal = subtotal + deliveryFee;

  const isMinOrderMet = subtotal >= MIN_ORDER_AMOUNT;
  const amountToFreeDelivery = Math.max(0, FREE_DELIVERY_THRESHOLD - subtotal);
  const freeDeliveryProgress = Math.min(1, subtotal / FREE_DELIVERY_THRESHOLD);

  return {
    subtotal,
    discountAmount,
    deliveryFee,
    total,
    originalTotal,
    isMinOrderMet,
    amountToFreeDelivery,
    freeDeliveryProgress,
  };
});

export default cartSlice.reducer;
