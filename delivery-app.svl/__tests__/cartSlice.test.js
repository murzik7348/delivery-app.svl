import reducer, {
    addToCart,
    removeItem,
    decrementItem,
    updateQuantity,
    applyDiscount,
    clearCart,
    setDeliveryType,
    makeCartKey,
    selectCartSummary,
    MIN_ORDER_AMOUNT,
    FREE_DELIVERY_THRESHOLD,
    BASE_DELIVERY_FEE,
} from '../store/cartSlice';

// ─── Fixtures ─────────────────────────────────────────────────────────────────
const mockProduct = { product_id: 'p1', price: 200, name: 'Burger', image: '' };
const mockProductWithMods = {
    product_id: 'p1',
    price: 200,
    name: 'Burger',
    image: '',
    modifiers: [{ id: 'cheese', name: 'Cheese', price: 20, qty: 1 }],
};
const mockPromoFixed = { code: 'SAVE50', type: 'fixed', discount: 50 };
const mockPromoPercent = { code: 'PCT20', type: 'percent', discount: 20 };

const baseState = () => reducer(undefined, { type: '@@INIT' });

// ─── makeCartKey ──────────────────────────────────────────────────────────────
describe('makeCartKey', () => {
    test('returns id| when no modifiers', () => {
        expect(makeCartKey(mockProduct)).toBe('p1|');
    });

    test('includes sorted modifier ids and quantities', () => {
        const item = {
            product_id: 'p1',
            modifiers: [
                { id: 'onion', price: 0, qty: 1 },
                { id: 'cheese', price: 20, qty: 2 },
            ],
        };
        // sorted: cheese first (c < o)
        expect(makeCartKey(item)).toBe('p1|cheese:2_onion:1');
    });

    test('same product different modifiers → different keys', () => {
        const keyA = makeCartKey({ product_id: 'p1', modifiers: [{ id: 'cheese', price: 20, qty: 1 }] });
        const keyB = makeCartKey({ product_id: 'p1', modifiers: [{ id: 'onion', price: 0, qty: 1 }] });
        expect(keyA).not.toBe(keyB);
    });
});

// ─── Reducer ──────────────────────────────────────────────────────────────────
describe('cartSlice reducer', () => {
    test('returns the initial state on first run', () => {
        const state = baseState();
        expect(state.items).toEqual([]);
        expect(state.subtotal).toBe(0);
        expect(state.deliveryFee).toBe(0);
    });

    // ── addToCart ──────────────────────────────────────────────────────────────
    test('addToCart: adds a new item with quantity 1 and calculates totals', () => {
        const state = reducer(baseState(), addToCart(mockProduct));
        expect(state.items).toHaveLength(1);
        expect(state.items[0].quantity).toBe(1);
        expect(state.subtotal).toBe(200);
        expect(state.deliveryFee).toBe(BASE_DELIVERY_FEE); // subtotal < FREE_DELIVERY_THRESHOLD
        expect(state.totalAmount).toBe(200 + BASE_DELIVERY_FEE);
    });

    test('addToCart: increments quantity for same product+modifiers', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        state = reducer(state, addToCart(mockProduct));
        expect(state.items).toHaveLength(1);
        expect(state.items[0].quantity).toBe(2);
    });

    // Feature 2: modifier-aware grouping
    test('addToCart: same product with different modifiers → 2 separate line items', () => {
        const productA = { product_id: 'p1', price: 200, name: 'Burger', modifiers: [{ id: 'cheese', price: 20, qty: 1 }] };
        const productB = { product_id: 'p1', price: 200, name: 'Burger', modifiers: [{ id: 'onion', price: 0, qty: 1 }] };
        let state = reducer(baseState(), addToCart(productA));
        state = reducer(state, addToCart(productB));
        expect(state.items).toHaveLength(2);
    });

    test('addToCart: modifier prices are included in subtotal', () => {
        const state = reducer(baseState(), addToCart(mockProductWithMods));
        // (200 + 20) * 1 = 220; + 50 delivery fee
        expect(state.subtotal).toBe(220);
        expect(state.totalAmount).toBe(220 + BASE_DELIVERY_FEE);
    });

    test('addToCart: warns and returns when product has no id', () => {
        const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => { });
        const state = reducer(baseState(), addToCart({ name: 'Ghost', price: 10 }));
        expect(state.items).toHaveLength(0);
        consoleSpy.mockRestore();
    });

    // ── decrementItem ──────────────────────────────────────────────────────────
    test('decrementItem: reduces quantity by 1', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        state = reducer(state, addToCart(mockProduct)); // quantity = 2
        const key = state.items[0].cartKey;
        state = reducer(state, decrementItem(key));
        expect(state.items[0].quantity).toBe(1);
    });

    test('decrementItem: stops at 1 and does NOT remove item', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        const key = state.items[0].cartKey;
        state = reducer(state, decrementItem(key)); // should stay at 1
        expect(state.items).toHaveLength(1);
        expect(state.items[0].quantity).toBe(1);
    });

    // ── removeItem ────────────────────────────────────────────────────────────
    test('removeItem: removes the line item by cartKey', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        const key = state.items[0].cartKey;
        state = reducer(state, removeItem(key));
        expect(state.items).toHaveLength(0);
        expect(state.subtotal).toBe(0);
    });

    // ── updateQuantity ────────────────────────────────────────────────────────
    test('updateQuantity: sets absolute quantity via cartKey', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        const key = state.items[0].cartKey;
        state = reducer(state, updateQuantity({ cartKey: key, quantity: 5 }));
        expect(state.items[0].quantity).toBe(5);
        expect(state.subtotal).toBe(1000);
    });

    test('updateQuantity: enforces minimum of 1 on negative/zero input', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        const key = state.items[0].cartKey;
        state = reducer(state, updateQuantity({ cartKey: key, quantity: -3 }));
        expect(state.items[0].quantity).toBe(1);
    });

    test('updateQuantity: safely ignores NaN payloads', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        const key = state.items[0].cartKey;
        state = reducer(state, updateQuantity({ cartKey: key, quantity: 'abc' }));
        expect(state.items[0].quantity).toBe(1); // unchanged
    });

    // ── applyDiscount (fixed) ─────────────────────────────────────────────────
    test('applyDiscount: fixed promo reduces totalAmount', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        state = reducer(state, applyDiscount(mockPromoFixed));
        expect(state.appliedPromo).toEqual(mockPromoFixed);
        expect(state.discountAmount).toBe(50);
        expect(state.totalAmount).toBe(200 + BASE_DELIVERY_FEE - 50);
    });

    test('applyDiscount: percent promo reduces totalAmount', () => {
        let state = reducer(baseState(), addToCart(mockProduct));
        // subtotal = 200, 20% = 40
        state = reducer(state, applyDiscount(mockPromoPercent));
        expect(state.discountAmount).toBe(40);
        expect(state.totalAmount).toBe(200 + BASE_DELIVERY_FEE - 40);
    });

    // ── Free delivery threshold ───────────────────────────────────────────────
    test('deliveryFee is 0 when subtotal >= FREE_DELIVERY_THRESHOLD', () => {
        const bigProduct = { product_id: 'p2', price: FREE_DELIVERY_THRESHOLD, name: 'Combo' };
        const state = reducer(baseState(), addToCart(bigProduct));
        expect(state.deliveryFee).toBe(0);
        expect(state.totalAmount).toBe(FREE_DELIVERY_THRESHOLD);
    });
});

// ─── selectCartSummary selector ───────────────────────────────────────────────
describe('selectCartSummary selector', () => {
    const storeState = (cartState) => ({ cart: cartState });

    test('empty cart: isMinOrderMet is false, progress is 0', () => {
        const summary = selectCartSummary(storeState(baseState()));
        expect(summary.isMinOrderMet).toBe(false);
        expect(summary.freeDeliveryProgress).toBe(0);
        expect(summary.amountToFreeDelivery).toBe(FREE_DELIVERY_THRESHOLD);
    });

    test('isMinOrderMet is true when subtotal >= MIN_ORDER_AMOUNT', () => {
        const cartState = reducer(baseState(), addToCart({ product_id: 'x', price: MIN_ORDER_AMOUNT, name: 'X' }));
        const summary = selectCartSummary(storeState(cartState));
        expect(summary.isMinOrderMet).toBe(true);
    });

    test('freeDeliveryProgress clamps to 1 when subtotal >= FREE_DELIVERY_THRESHOLD', () => {
        const cartState = reducer(baseState(), addToCart({ product_id: 'x', price: 600, name: 'X' }));
        const summary = selectCartSummary(storeState(cartState));
        expect(summary.freeDeliveryProgress).toBe(1);
        expect(summary.amountToFreeDelivery).toBe(0);
    });

    test('originalTotal is subtotal+fee before discount (for strikethrough)', () => {
        let cartState = reducer(baseState(), addToCart(mockProduct));
        cartState = reducer(cartState, applyDiscount(mockPromoFixed));
        const summary = selectCartSummary(storeState(cartState));
        expect(summary.originalTotal).toBe(200 + BASE_DELIVERY_FEE);
        expect(summary.discountAmount).toBe(50);
        expect(summary.total).toBe(200 + BASE_DELIVERY_FEE - 50);
    });
});
