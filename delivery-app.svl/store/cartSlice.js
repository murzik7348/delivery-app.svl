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
  let base = safeNum(item.price);
  if (item.pricingType === 'piece_variable') {
    const avgWeight = safeNum(item.averageWeight ?? item.weightGrams ?? 100);
    base = base * (avgWeight / 100);
  }
  const addOns = (item.modifiers ?? []).reduce(
    (sum, m) => sum + safeNum(m.price) * (m.qty ?? 1),
    0
  );
  return Math.round((base + addOns) * 100) / 100;
};

/**
 * Format price to clean decimal string, eliminating trailing floating point noise.
 * Examples: 135.00 -> "135", 135.70 -> "135.70", 135.75 -> "135.75"
 */
export const formatPrice = (value) => {
  const num = parseFloat(value);
  if (!Number.isFinite(num)) return '0';
  
  // Round to 2 decimal places to clear any JS floating point errors
  const rounded = Math.round(num * 100) / 100;
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }
  
  const formatted = rounded.toFixed(2);
  if (formatted.endsWith('.00')) {
    return rounded.toFixed(0);
  }
  if (formatted.endsWith('0')) {
    return formatted;
  }
  return formatted;
};

/** Recalculate derived totals in-place (mutates Immer draft). */
const calculateTotals = (state) => {
  const rawSubtotal = state.items.reduce(
    (sum, item) => sum + lineUnitPrice(item) * (item.quantity || 1),
    0
  );
  state.subtotal = Math.round(rawSubtotal * 100) / 100;

  if (state.deliveryType === 'delivery' && state.subtotal > 0) {
    let baseFee = state.customDeliveryFee !== null && state.customDeliveryFee !== undefined
      ? state.customDeliveryFee
      : BASE_DELIVERY_FEE;
    if (state.deliveryCoefficient && state.deliveryCoefficient.isActive) {
      baseFee = baseFee * safeNum(state.deliveryCoefficient.multiplier);
    }
    state.deliveryFee = baseFee;
  } else {
    state.deliveryFee = 0;
  }

  if (state.appliedPromo && state.subtotal > 0) {
    const promo = state.appliedPromo;
    if (promo.type === 'buy2half') {
      const promoItem = state.items.find((i) => resolveId(i) === promo.productId);
      if (promoItem) {
        const discountedCount = Math.floor(promoItem.quantity / 2);
        const rawDiscount = discountedCount * lineUnitPrice(promoItem) * (promo.percent / 100);
        state.discountAmount = Math.round(rawDiscount * 100) / 100;
      } else {
        state.discountAmount = 0;
      }
    } else if (promo.type === 'percent') {
      const rawDiscount = (state.subtotal * promo.discount) / 100;
      state.discountAmount = Math.round(rawDiscount * 100) / 100;
    } else if (promo.type === 'fixed') {
      state.discountAmount = Math.min(promo.discount, state.subtotal);
    } else {
      state.discountAmount = 0;
    }
  } else {
    state.discountAmount = 0;
  }

  state.discountAmount = Math.round(state.discountAmount * 100) / 100;

  const rawTotal = state.subtotal + state.deliveryFee - state.discountAmount;
  state.totalAmount = Math.max(0, Math.round(rawTotal * 100) / 100);
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
  customDeliveryFee: null,
  deliveryCoefficient: null,
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
        const step = safeNum(action.payload.weightStep ?? 100);
        const minW = safeNum(action.payload.minWeight ?? step);
        const initialQty = Math.max(1, Math.round(minW / step));

        state.items.push({
          ...action.payload,
          price: safePrice,
          modifiers: action.payload.modifiers ?? [],
          quantity: initialQty,
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
      if (item) {
        const step = safeNum(item.weightStep ?? 100);
        const minW = safeNum(item.minWeight ?? step);
        const minQty = Math.max(1, Math.round(minW / step));

        if (item.quantity > minQty) {
          item.quantity -= 1;
          calculateTotals(state);
        }
      }
    },

    /** Remove a line item entirely by its cartKey. */
    removeItem: (state, action) => {
      const cartKey = action.payload;
      state.items = state.items.filter((item) => item.cartKey !== cartKey);
      calculateTotals(state);
    },

    /** Remove all items from cart with matching productId. */
    removeFromCart: (state, action) => {
      const productId = action.payload;
      state.items = state.items.filter((item) => resolveId(item) !== productId);
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

    /**
     * Replace the modifiers array for an existing cart item.
     * Used by CartItemExtrasSheet when user adjusts add-ons.
     * Also updates the cartKey to reflect the new modifier combo.
     */
    updateCartItemModifiers: (state, action) => {
      const { cartKey, modifiers } = action.payload;
      const itemIdx = state.items.findIndex((i) => i.cartKey === cartKey);
      if (itemIdx === -1) return;

      const item = state.items[itemIdx];
      const newItem = { ...item, modifiers: modifiers ?? [] };
      const newCartKey = makeCartKey(newItem);

      // If cartKey didn't change (same mods), just update in place
      if (newCartKey === cartKey) {
        state.items[itemIdx].modifiers = modifiers ?? [];
      } else {
        // Check if a line item with the new key already exists → merge quantities
        const existingIdx = state.items.findIndex((i) => i.cartKey === newCartKey);
        if (existingIdx !== -1) {
          state.items[existingIdx].quantity += item.quantity;
          state.items.splice(itemIdx, 1);
        } else {
          state.items[itemIdx] = { ...newItem, cartKey: newCartKey };
        }
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
      state.customDeliveryFee = null;
      state.deliveryCoefficient = null;
    },

    setCustomDeliveryFee: (state, action) => {
      state.customDeliveryFee = action.payload;
      calculateTotals(state);
    },

    setDeliveryCoefficient: (state, action) => {
      state.deliveryCoefficient = action.payload;
      calculateTotals(state);
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
  extraReducers: (builder) => {
    builder.addCase('auth/logoutUser', () => initialState);
  },
});

// ─── Actions ──────────────────────────────────────────────────────────────────
export const {
  addToCart,
  decrementItem,
  removeItem,
  removeFromCart,
  updateQuantity,
  updateCartItemModifiers,
  clearCart,
  applyDiscount,
  removeDiscount,
  setDeliveryType,
  setOrderNote,
  setCustomDeliveryFee,
  setDeliveryCoefficient,
} = cartSlice.actions;

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
  const amountToFreeDelivery = 0;
  const freeDeliveryProgress = 0;

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


export const tryAddToCart = (product) => (dispatch, getState) => {
  const { cart } = getState();
  const existingItem = cart.items[0];
  if (existingItem) {
    const existingStoreId = Number(existingItem.restaurantId || existingItem.store_id);
    const newStoreId = Number(product.restaurantId || product.store_id);
    if (existingStoreId && newStoreId && existingStoreId !== newStoreId) {
      let Alert;
      try {
        Alert = require('react-native').Alert;
      } catch (e) {
        Alert = {
          alert: (title, message, buttons) => {
            console.log(`[Alert Mock] ${title}: ${message}`);
            const okButton = buttons && buttons.find(b => b.style !== 'cancel');
            if (okButton && okButton.onPress) okButton.onPress();
          }
        };
      }
      Alert.alert(
        'Різні ресторани',
        'Ваш кошик містить товари з іншого ресторану. Очистити кошик і додати цей товар?',
        [
          { text: 'Скасувати', style: 'cancel' },
          {
            text: 'Очистити і додати',
            style: 'destructive',
            onPress: () => {
              dispatch(clearCart());
              dispatch(addToCart(product));
            },
          },
        ]
      );
      return false;
    }
  }
  dispatch(addToCart(product));
  return true;
};

export default cartSlice.reducer;
