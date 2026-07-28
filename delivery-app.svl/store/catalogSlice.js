import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import CatalogService from '../services/CatalogService';

// ── Async Thunk ───────────────────────────────────────────────────────────────
export const fetchCatalog = createAsyncThunk(
    'catalog/fetchCatalog',
    async (_arg, { rejectWithValue }) => {
        try {
            return await CatalogService.fetchFullCatalog();
        } catch (err) {
            return rejectWithValue(err.message);
        }
    },
    {
        // Skip if already loading OR data is fresh (< 5 minutes old)
        // Pass { forceRefresh: true } to bypass the cache
        condition: (arg, { getState }) => {
            const { catalog } = getState();
            if (catalog.isLoading) return false;
            if (arg?.forceRefresh) return true;
            if (catalog.lastFetched && Date.now() - catalog.lastFetched < 5 * 60 * 1000) return false;
            return true;
        },
    }
);


export const fetchRestaurantProducts = createAsyncThunk(
    'catalog/fetchRestaurantProducts',
    async (restaurantId, { rejectWithValue }) => {
        try {
            return await CatalogService.fetchProductsByRestaurant(restaurantId);
        } catch (err) {
            return rejectWithValue(err.message);
        }
    }
);

// ── Slice ─────────────────────────────────────────────────────────────────────
const initialState = {
    categories: [],
    promotions: [],
    stores: [],
    products: [],
    isLoading: false,
    error: null,
    lastFetched: null,
};

const catalogSlice = createSlice({
    name: 'catalog',
    initialState,
    reducers: {
        setCatalogData: (state, action) => {
            if (action.payload.categories) state.categories = action.payload.categories;
            if (action.payload.promotions) state.promotions = action.payload.promotions;
            if (action.payload.stores) state.stores = action.payload.stores;
            if (action.payload.products) state.products = action.payload.products;
        },
        setLoading: (state, action) => { state.isLoading = action.payload; },
        setError: (state, action) => { state.error = action.payload; },
        removeProductFromCatalog: (state, action) => {
            const productId = action.payload;
            state.products = state.products.filter(p => p.product_id !== productId);
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCatalog.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCatalog.fulfilled, (state, action) => {
                state.isLoading = false;
                state.lastFetched = Date.now();
                const { categories: c, promotions: p, stores: s, products: pr } = action.payload;
                if (c) state.categories = c;
                if (p) state.promotions = p;
                if (s) state.stores = s;
                if (pr) {
                    const productMap = new Map();
                    pr.forEach(prod => {
                        const sId = prod.store_id || prod.restaurantId || 1;
                        const pId = prod.product_id || prod.id;
                        if (pId) productMap.set(`${sId}_${pId}`, prod);
                    });
                    state.products = Array.from(productMap.values());
                }
            })
            .addCase(fetchCatalog.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Failed to load catalog';
            })
            .addCase(fetchRestaurantProducts.fulfilled, (state, action) => {
                const newProducts = action.payload || [];
                if (newProducts.length === 0) return;

                // Merge products: replace existing ones with same store_id + product_id, add new ones
                const productMap = new Map();
                state.products.forEach(p => {
                    const sId = p.store_id || p.restaurantId || 1;
                    const pId = p.product_id || p.id;
                    if (pId) productMap.set(`${sId}_${pId}`, p);
                });
                newProducts.forEach(p => {
                    const sId = p.store_id || p.restaurantId || 1;
                    const pId = p.product_id || p.id;
                    if (pId) productMap.set(`${sId}_${pId}`, p);
                });
                state.products = Array.from(productMap.values());
            });
    },
});

export const { setCatalogData, setLoading, setError, removeProductFromCatalog } = catalogSlice.actions;

// Selectors
export const selectAllProducts = (state) => state.catalog.products;
export const selectAllCategories = (state) => state.catalog.categories;
export const selectAllStores = (state) => state.catalog.stores;
export const selectAllPromotions = (state) => state.catalog.promotions;

export default catalogSlice.reducer;
