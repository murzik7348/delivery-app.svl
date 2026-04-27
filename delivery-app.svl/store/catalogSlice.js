import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import CatalogService from '../services/CatalogService';

// ── Async Thunk ───────────────────────────────────────────────────────────────
export const fetchCatalog = createAsyncThunk(
    'catalog/fetchCatalog',
    async (_, { rejectWithValue }) => {
        try {
            return await CatalogService.fetchFullCatalog();
        } catch (err) {
            return rejectWithValue(err.message);
        }
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
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCatalog.pending, (state) => {
                state.isLoading = true;
                state.error = null;
            })
            .addCase(fetchCatalog.fulfilled, (state, action) => {
                state.isLoading = false;
                const { categories: c, promotions: p, stores: s, products: pr } = action.payload;
                if (c) state.categories = c;
                if (p) state.promotions = p;
                if (s) state.stores = s;
                if (pr) state.products = pr;
            })
            .addCase(fetchCatalog.rejected, (state, action) => {
                state.isLoading = false;
                state.error = action.payload ?? 'Failed to load catalog';
                // Keep existing mock data in state so the app stays usable
            })
            .addCase(fetchRestaurantProducts.fulfilled, (state, action) => {
                const newProducts = action.payload || [];
                if (newProducts.length === 0) return;

                // Merge products: replace existing ones with same ID, add new ones
                const productMap = new Map(state.products.map(p => [p.product_id, p]));
                newProducts.forEach(p => {
                    productMap.set(p.product_id, p);
                });
                state.products = Array.from(productMap.values());
            });
    },
});

export const { setCatalogData, setLoading, setError } = catalogSlice.actions;

// Selectors
export const selectAllProducts = (state) => state.catalog.products;
export const selectAllCategories = (state) => state.catalog.categories;
export const selectAllStores = (state) => state.catalog.stores;
export const selectAllPromotions = (state) => state.catalog.promotions;

export default catalogSlice.reducer;
