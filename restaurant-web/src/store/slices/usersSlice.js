import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchAllUsers, adminCreateCourier, adminDeleteCourier } from '../../api/users';
import { showToast } from './toastSlice';

export const getUsers = createAsyncThunk(
  'users/getUsers',
  async (params, { rejectWithValue }) => {
    try {
      // Returns { items, totalItems, totalPages, currentPage }
      return await fetchAllUsers(params);
    } catch {
      return rejectWithValue('Failed to fetch users');
    }
  }
);

export const changeUserRole = createAsyncThunk(
  'users/changeUserRole',
  async ({ userId, newRole }, { rejectWithValue, dispatch }) => {
    const roleId = Number(newRole);
    try {
      if (roleId === 1) {
        await adminCreateCourier(userId);
        return { userId, newRole: 1, role: 'courier' };
      }
      if (roleId === 0) {
        await adminDeleteCourier(userId);
        return { userId, newRole: 0, role: 'user' };
      }
      dispatch(showToast({ message: 'Роль Manager/Admin/SuperAdmin: endpoint /admin/users/{id}/role відсутній на бекенді.', type: 'error' }));
      return rejectWithValue('Role change not supported by API');
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to change user role');
    }
  }
);

export const toggleBanStatus = createAsyncThunk(
  'users/toggleBanStatus',
  async (userId, { rejectWithValue }) => {
    try {
      // NOTE: The current spec provided does NOT show a specific ban endpoint.
      // Keeping this as a placeholder or removing if not supported by backend yet.
      // For now, I'll comment it out or leave it as is if it was working before.
      return rejectWithValue('Ban action not supported in current API spec');
    } catch {
      return rejectWithValue('Failed to update ban status');
    }
  }
);

const initialState = {
  items: [],
  pagination: { totalPages: 1, currentPage: 1, totalItems: 0 },
  isLoading: false,
  error: null,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch Users
      .addCase(getUsers.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        
        // Handle different possible backend response shapes
        const payload = action.payload || {};
        const items = Array.isArray(payload) ? payload : (payload.items || payload.data || []);
        
        state.items = items;
        
        // Safely extract pagination or fallback to single page
        state.pagination = {
            totalPages: payload.totalPages || 1,
            currentPage: payload.currentPage || 1,
            totalItems: payload.totalItems || items.length
        };
      })
      .addCase(getUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      
      // Change Role
      .addCase(changeUserRole.fulfilled, (state, action) => {
        const { userId, role } = action.payload || {};
        const index = state.items.findIndex(u => Number(u.id || u.userId || u._id) === Number(userId));
        if (index !== -1 && role) {
            state.items[index].role = role;
        }
      })
      
      // Toggle Ban
      .addCase(toggleBanStatus.fulfilled, (state, action) => {
        const updatedUser = action.payload || {};
        const updatedId = updatedUser.id || updatedUser.userId || updatedUser._id;
        const index = state.items.findIndex(u => (u.id || u.userId || u._id) === updatedId);
        if (index !== -1) {
            state.items[index].status = updatedUser.status;
        }
      });
  },
});

export default usersSlice.reducer;
