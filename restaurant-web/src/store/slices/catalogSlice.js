import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProducts, fetchCategories, fetchRestaurants, createProduct, updateProduct, deleteProduct, uploadProductImage } from '../../api/catalog';

export const getProducts = createAsyncThunk(
  'catalog/getProducts',
  async (params, { rejectWithValue }) => {
    try {
      const response = await fetchProducts(params);
      // Depending on how backend returns pagination vs array (e.g. { items, totalCount } or just [...items])
      return response.items || response.data || response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch products');
    }
  }
);

export const getCategories = createAsyncThunk(
  'catalog/getCategories',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchCategories();
      return response.items || response.data || response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch categories');
    }
  }
);

export const getRestaurants = createAsyncThunk(
  'catalog/getRestaurants',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchRestaurants();
      return response.items || response.data || response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch restaurants');
    }
  }
);

export const addProduct = createAsyncThunk(
    'catalog/addProduct',
    async ({ productData, imageFile }, { rejectWithValue }) => {
        try {
            const response = await createProduct(productData);
            const productId = response.id || response.data?.id;
            
            // Upload image if provided and successfully created
            if (productId && imageFile) {
                await uploadProductImage(productId, imageFile);
            }
            
            return response;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to add product');
        }
    }
);

export const editProduct = createAsyncThunk(
    'catalog/editProduct',
    async ({ id, data, imageFile }, { rejectWithValue }) => {
        try {
            const response = await updateProduct(id, data);
            
            if (imageFile) {
                await uploadProductImage(id, imageFile);
            }
            
            return response;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to edit product');
        }
    }
);
export const removeProduct = createAsyncThunk(
    'catalog/removeProduct',
    async (id, { rejectWithValue }) => {
        try {
            await deleteProduct(id);
            return id;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to delete product');
        }
    }
);


export const toggleProductStatus = createAsyncThunk(
    'catalog/toggleProductStatus',
    async ({ id, inStock }, { rejectWithValue }) => {
        try {
            await updateProduct(id, { inStock: !inStock });
            return { id, inStock: !inStock };
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to toggle status');
        }
    }
);


const initialState = {
  products: [],
  categories: [],
  restaurants: [],
  isLoading: false,
  error: null,
};

const catalogSlice = createSlice({
  name: 'catalog',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Products
      .addCase(getProducts.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getProducts.fulfilled, (state, action) => {
        state.isLoading = false;
        state.products = action.payload;
      })
      .addCase(getProducts.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Fetch Categories
      .addCase(getCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })

      // Fetch Restaurants
      .addCase(getRestaurants.fulfilled, (state, action) => {
        state.restaurants = action.payload || [];
      })
      
      // Add Product
      .addCase(addProduct.fulfilled, (state, action) => {
        if(action.payload && action.payload.id) {
           state.products.unshift(action.payload);
        }
      })
      
      // Edit Product
      .addCase(editProduct.fulfilled, (state, action) => {
        if(action.payload && action.payload.id) {
            const index = state.products.findIndex(p => p.id === action.payload.id);
            if(index !== -1) {
                state.products[index] = action.payload;
            }
        }
      })
      
      // Delete Product
      .addCase(removeProduct.fulfilled, (state, action) => {
        state.products = state.products.filter(p => p.id !== action.payload);
      })
      
      // Toggle Status
      .addCase(toggleProductStatus.fulfilled, (state, action) => {
        const index = state.products.findIndex(p => p.id === action.payload.id);
        if (index !== -1) {
            state.products[index].inStock = action.payload.inStock;
        }
      });
  },
});

export default catalogSlice.reducer;
