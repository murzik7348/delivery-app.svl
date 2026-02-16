import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  items: [],
  subtotal: 0,        // Сума товарів
  deliveryFee: 0,     // Вартість доставки
  discountAmount: 0,  // Знижка
  totalAmount: 0,     // До сплати
  appliedPromo: null, // Промокод
  deliveryType: 'delivery', // 'delivery' або 'pickup'
  orderNote: '',      // Коментар до замовлення
};

// Формула розрахунку
const calculateTotals = (state) => {
  // 1. Сума товарів
  state.subtotal = state.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  // 2. Вартість доставки (тільки якщо вибрано доставку і кошик не пустий)
  if (state.deliveryType === 'delivery' && state.subtotal > 0) {
    // Тут можна поставити свою логіку (наприклад, безкоштовно від 1000 грн)
    state.deliveryFee = state.subtotal >= 1000 ? 0 : 50; 
  } else {
    state.deliveryFee = 0;
  }

  // 3. Знижка
  if (state.appliedPromo && state.subtotal > 0) {
    if (state.appliedPromo.type === 'percent') {
      state.discountAmount = (state.subtotal * state.appliedPromo.discount) / 100;
    } else if (state.appliedPromo.type === 'fixed') {
      state.discountAmount = state.appliedPromo.discount;
    } else {
      state.discountAmount = 0;
    }
  } else {
    state.discountAmount = 0;
  }

  // 4. Фінальна сума (не менше 0)
  const finalTotal = state.subtotal + state.deliveryFee - state.discountAmount;
  state.totalAmount = finalTotal < 0 ? 0 : finalTotal;
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action) => {
      const existingItem = state.items.find(item => item.id === action.payload.id || item.product_id === action.payload.product_id);
      if (existingItem) {
        existingItem.quantity += 1;
      } else {
        state.items.push({ ...action.payload, quantity: 1 });
      }
      calculateTotals(state);
    },
    removeFromCart: (state, action) => {
      const index = state.items.findIndex(item => item.id === action.payload || item.product_id === action.payload);
      if (index >= 0) {
        state.items.splice(index, 1);
      }
      calculateTotals(state);
    },
    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload;
      const item = state.items.find(item => item.id === id || item.product_id === id);
      if (item) item.quantity = quantity;
      calculateTotals(state);
    },
    clearCart: (state) => {
      state.items = [];
      state.subtotal = 0;
      state.totalAmount = 0;
      state.discountAmount = 0;
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
    // 👇 Нові дії для доставки і нотаток
    setDeliveryType: (state, action) => {
      state.deliveryType = action.payload;
      calculateTotals(state);
    },
    setOrderNote: (state, action) => {
      state.orderNote = action.payload;
    }
  }
});

export const { 
  addToCart, removeFromCart, updateQuantity, clearCart, 
  applyDiscount, removeDiscount, setDeliveryType, setOrderNote 
} = cartSlice.actions;

export default cartSlice.reducer;