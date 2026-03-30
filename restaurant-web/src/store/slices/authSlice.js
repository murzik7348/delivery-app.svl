import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { authLogin, getMe } from '../../api/auth';
import { removeToken, getToken } from '../../api/client';

export const loginAdmin = createAsyncThunk(
  'auth/loginAdmin',
  async (credentials, { rejectWithValue }) => {
    try {
      // API Call: POST /auth/login
      const response = await authLogin(credentials);
      
      // Token is already saved in src/api/auth.js
      const token = typeof response === 'string' ? response : response?.accessToken;
      if (token) {
        const user = response.user || await getMe();
        return { token, user };
      }
      return rejectWithValue('No token returned');
    } catch (err) {
      return rejectWithValue(err.message || 'Login failed');
    }
  }
);

export const checkAuthStatus = createAsyncThunk(
  'auth/checkAuthStatus',
  async (_, { rejectWithValue }) => {
    try {
        const token = getToken();
        if(!token) return rejectWithValue('No token');
        
        const user = await getMe();
        return { token, user };
    } catch (err) {
        removeToken();
        return rejectWithValue(err.message || 'Session expired');
    }
  }
);

const initialState = {
  user: null,
  token: getToken(),
  isAuthenticated: !!getToken(),
  isLoading: false,
  error: null,
};

const SUPER_ADMIN_PHONES = [
  '+380684047200',
  '+380991300000',
  '+380991300001',
  '+380991300002',
  '+380991300003'
];

export const processUserRole = (user) => {
  if (!user) return user;
  const phone = user.phone || user.phoneNumber;
  const isSuper = SUPER_ADMIN_PHONES.includes(phone) || Number(user.role) === 4;
  
  return {
    ...user,
    isSuperAdmin: isSuper,
    roleName: Number(user.role) === 4 ? 'superadmin' : 
              Number(user.role) === 3 ? 'admin' :
              Number(user.role) === 2 ? 'manager' :
              Number(user.role) === 1 ? 'courier' : 'user'
  };
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout: (state) => {
      removeToken();
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      window.location.href = '/login';
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAdmin.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAdmin.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = processUserRole(action.payload.user);
        console.log('👤 [Auth] User logged in:', state.user);
      })
      .addCase(loginAdmin.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      // Check Auth
      .addCase(checkAuthStatus.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.user = processUserRole(action.payload.user);
        console.log('👤 [Auth] User session restored:', state.user);
      })
      .addCase(checkAuthStatus.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        state.token = null;
      });
  },
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
