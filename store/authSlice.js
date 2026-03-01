import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getMe,
  getAddresses,
  setDefaultAddress as apiSetDefaultAddress,
  logout as apiLogout,
} from '../src/api';

// ── Async Thunks ──────────────────────────────────────────────────────────────

/** Fetch current user profile from backend (call after login/verify) */
export const fetchMe = createAsyncThunk('auth/fetchMe', async (_, { rejectWithValue }) => {
  try {
    return await getMe();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Fetch user's saved addresses from backend */
export const fetchAddresses = createAsyncThunk('auth/fetchAddresses', async (_, { rejectWithValue }) => {
  try {
    return await getAddresses();
  } catch (err) {
    return rejectWithValue(err.message);
  }
});

/** Set an address as default on backend then update local list */
export const setDefaultAddressThunk = createAsyncThunk(
  'auth/setDefaultAddress',
  async (id, { rejectWithValue }) => {
    try {
      await apiSetDefaultAddress(id);
      return id;
    } catch (err) {
      return rejectWithValue(err.message);
    }
  }
);

// ── Slice ─────────────────────────────────────────────────────────────────────

const initialState = {
  isAuthenticated: false,
  user: null,
  addresses: [],
  paymentMethods: [
    { id: '1', type: 'Apple Pay', last4: null },
    { id: '2', type: 'Картка', last4: '4114' },
    { id: '3', type: 'Готівка', last4: null },
  ],
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginUser: (state, action) => {
      state.isAuthenticated = true;
      state.user = action.payload;
    },
    logoutUser: (state) => {
      // Clear JWT from AsyncStorage (fire-and-forget)
      apiLogout().catch(() => { });
      state.isAuthenticated = false;
      state.user = null;
      state.addresses = [];
    },
    updateUser: (state, action) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
    addAddress: (state, action) => {
      state.addresses.push(action.payload);
    },
    removeAddress: (state, action) => {
      state.addresses = state.addresses.filter((a) => a.id !== action.payload);
    },
    addPaymentMethod: (state, action) => {
      state.paymentMethods.push(action.payload);
    },
    removePaymentMethod: (state, action) => {
      state.paymentMethods = state.paymentMethods.filter((p) => p.id !== action.payload);
    },
  },
  extraReducers: (builder) => {
    // fetchMe
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        // Keep existing state if fetchMe fails (e.g. no network)
      });

    // fetchAddresses
    builder
      .addCase(fetchAddresses.fulfilled, (state, action) => {
        state.addresses = action.payload ?? [];
      })
      .addCase(fetchAddresses.rejected, () => {
        // Keep existing cached addresses
      });

    // setDefaultAddress
    builder.addCase(setDefaultAddressThunk.fulfilled, (state, action) => {
      const defaultId = action.payload;
      state.addresses = state.addresses.map((a) => ({
        ...a,
        isDefault: a.id === defaultId,
      }));
    });
  },
});

export const {
  loginUser,
  logoutUser,
  updateUser,
  addAddress,
  removeAddress,
  addPaymentMethod,
  removePaymentMethod,
} = authSlice.actions;

export default authSlice.reducer;