import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import CatalogService from '../services/CatalogService';
import { categories, promotions, stores, products } from '../data/mockData';

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

// ── Slice ─────────────────────────────────────────────────────────────────────
const initialState = {
    categories,
    promotions,
    stores,
    products,
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
