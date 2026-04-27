import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchProducts, fetchCategories, fetchRestaurants, createProduct, updateProduct, deleteProduct, uploadProductImage, createCategory, updateCategory, uploadCategoryImage, uploadRestaurantImage, deleteCategory } from '../../api/catalog';

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
            // Creation POST /product MUST be multipart/form-data and MUST include the image
            // We use PascalCase for fields because backend multipart parser is strict
            const formData = new FormData();
            formData.append('Name', productData.name);
            formData.append('Price', productData.price);
            formData.append('WeightGrams', productData.weightGrams);
            formData.append('CategoryId', productData.categoryId);
            formData.append('Description', productData.description || '');
            formData.append('RestaurantId', productData.restaurantId);
            
            if (imageFile) {
                formData.append('Image', imageFile);
            }
            
            const response = await createProduct(formData);
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

export const editCategory = createAsyncThunk(
    'catalog/editCategory',
    async ({ id, name, imageFile }, { rejectWithValue }) => {
        try {
            const response = await updateCategory(id, name);
            if (imageFile) {
                await uploadCategoryImage(id, imageFile);
            }
            return response;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to edit category');
        }
    }
);

export const addCategory = createAsyncThunk(
    'catalog/addCategory',
    async ({ name, imageFile }, { rejectWithValue }) => {
        try {
            const formData = new FormData();
            formData.append('Name', name);
            if (imageFile) {
                formData.append('Image', imageFile);
            }
            const response = await createCategory(formData);
            return response;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to add category');
        }
    }
);

export const updateRestaurantPhoto = createAsyncThunk(
    'catalog/updateRestaurantPhoto',
    async ({ restaurantId, imageFile }, { rejectWithValue }) => {
        try {
            const response = await uploadRestaurantImage(restaurantId, imageFile);
            return response;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to update restaurant photo');
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

export const removeCategory = createAsyncThunk(
    'catalog/removeCategory',
    async (id, { rejectWithValue }) => {
        try {
            await deleteCategory(id);
            return id;
        } catch (err) {
            return rejectWithValue(err.message || 'Failed to delete category');
        }
    }
);


export const toggleProductStatus = createAsyncThunk(
    'catalog/toggleProductStatus',
    async ({ id, inStock }, { rejectWithValue }) => {
        try {
            const response = await updateProduct(id, { inStock: !inStock });
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
      
      .addCase(getCategories.fulfilled, (state, action) => {
        state.categories = action.payload;
      })
      
      // Add Category
      .addCase(addCategory.fulfilled, (state, action) => {
        if (action.payload && (action.payload.id || action.payload.categoryId)) {
          state.categories.unshift(action.payload);
        }
      })
      
      // Edit Category
      .addCase(editCategory.fulfilled, (state, action) => {
        if(action.payload && (action.payload.id || action.payload.categoryId)) {
            const id = action.payload.id || action.payload.categoryId;
            const index = state.categories.findIndex(c => (c.id || c.categoryId) === id);
            if(index !== -1) {
                state.categories[index] = action.payload;
            }
        }
      })

      // Fetch Restaurants
      .addCase(getRestaurants.fulfilled, (state, action) => {
        state.restaurants = action.payload || [];
      })
      
      .addCase(addProduct.fulfilled, (state, action) => {
        // Since backend returns only ID (integer), we don't unshift here.
        // The component handles refetching the full product list.
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
      
      // Delete Category
      .addCase(removeCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => (c.id || c.categoryId) !== action.payload);
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
