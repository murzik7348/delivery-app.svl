import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { fetchSystemSettings, updateSystemSettings } from '../../api/settings';

export const getSettings = createAsyncThunk(
  'settings/getSettings',
  async (_, { rejectWithValue }) => {
    try {
      return await fetchSystemSettings();
    } catch {
      return rejectWithValue('Failed to fetch settings');
    }
  }
);

export const saveSettings = createAsyncThunk(
  'settings/saveSettings',
  async (updates, { rejectWithValue }) => {
    try {
      return await updateSystemSettings(updates);
    } catch {
      return rejectWithValue('Failed to update settings');
    }
  }
);

const initialState = {
  data: {
      courierFee: null,
      emergencyClose: null,
  },
  isLoading: false,
  error: null,
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(getSettings.pending, (state) => { state.isLoading = true; })
      .addCase(getSettings.fulfilled, (state, action) => {
        state.isLoading = false;
        if(action.payload) state.data = action.payload;
        state.error = null;
      })
      .addCase(getSettings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Settings API not available';
      })
      .addCase(saveSettings.fulfilled, (state, action) => {
         if(action.payload) state.data = action.payload;
         state.error = null;
      });
  },
});

export default settingsSlice.reducer;
