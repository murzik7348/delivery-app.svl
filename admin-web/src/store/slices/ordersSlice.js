import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import {
  fetchAllDeliveries,
  confirmDeliveryRestaurant,
  cancelDeliveryRestaurant,
  acceptDeliveryCourier,
  pickupDeliveryCourier,
  confirmDeliveryCourier,
  deleteDelivery,
  acceptDelivery
} from '../../api/orders';
import { showToast } from './toastSlice';

export const getOrders = createAsyncThunk(
  'orders/getOrders',
  async (status, { rejectWithValue }) => {
    try {
      // Backend expects status 0-5. null means all.
      const response = await fetchAllDeliveries({ page: 1, pageSize: 50, status });

      // Extract items robustly
      if (Array.isArray(response)) return response;
      if (response && response.items && Array.isArray(response.items)) return response.items;
      if (response && response.data && Array.isArray(response.data)) return response.data;
      if (response && response.deliveries && Array.isArray(response.deliveries)) return response.deliveries;

      return response;
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch orders');
    }
  }
);

export const changeOrderStatus = createAsyncThunk(
  'orders/changeOrderStatus',
  async ({ orderId, newStatusId, oldStatusId, backendAction }, { rejectWithValue, dispatch }) => {
    try {
      switch (backendAction) {
        case 'generalAccept': await acceptDelivery(orderId); break;
        case 'confirmRest': await confirmDeliveryRestaurant(orderId); break;
        case 'cancelRest': await cancelDeliveryRestaurant(orderId); break;
        case 'acceptCour': await acceptDeliveryCourier(orderId); break;
        case 'pickupCour': await pickupDeliveryCourier(orderId); break;
        case 'confirmCour': await confirmDeliveryCourier(orderId); break;
        default: break;
      }
      return { orderId, newStatusId };
    } catch (err) {
      const status = err?.status ?? err?.response?.status;
      const msg = status === 403
        ? '403 Forbidden: Адмін не має доступу. Дія дозволена тільки для Ресторану/Кур\'єра.'
        : (err?.message || 'Не вдалося оновити статус');
      dispatch(showToast({ message: msg, type: 'error' }));
      // Refetch to sync UI with backend reality
      dispatch(getOrders(null));
      return rejectWithValue({ message: err?.message, orderId, oldStatusId });
    }
  }
);

export const purgeOrders = createAsyncThunk(
  'orders/purgeOrders',
  async (orderIds, { rejectWithValue }) => {
    try {
      const results = [];
      for (const id of orderIds) {
        try {
          // Try to DELETE from DB first (guessed endpoint)
          await deleteDelivery(id);
          results.push({ id, status: 'deleted' });
        } catch (err) {
          // Fallback: If DELETE is not allowed, try to CANCEL them so they at least clear from active lanes
          try {
            // status 6 = canceled
            await cancelDeliveryRestaurant(id);
            results.push({ id, status: 'canceled' });
          } catch (cancelErr) {
            results.push({ id, status: 'failed', error: cancelErr.message });
          }
        }
      }
      return results;
    } catch (err) {
      return rejectWithValue(err.message || 'Purge failed');
    }
  }
);


const initialState = {
  items: [],
  isLoading: false,
  error: null,
  localOverrides: {},
};

const STATUSES_KEYS = {
  0: 'created', 
  1: 'accepted', 
  2: 'paid', 
  3: 'preparing', 
  4: 'ready_for_pickup', 
  5: 'delivering', 
  6: 'delivered', 
  7: 'canceled'
};

const ordersSlice = createSlice({
  name: 'orders',
  initialState,
  reducers: {
    setLocalStatusOverride: (state, action) => {
      const { orderId, newStatusId } = action.payload;
      state.localOverrides[orderId] = {
        deliveryStatus: newStatusId,
        statusDelivery: STATUSES_KEYS[newStatusId] || state.localOverrides[orderId]?.statusDelivery || null,
      };
      const index = state.items.findIndex(o => (o.deliveryId || o.id) === orderId);
      if (index !== -1) {
        state.items[index].deliveryStatus = newStatusId;
        state.items[index].statusDelivery = state.localOverrides[orderId].statusDelivery;
      }
    },
    clearLocalStatusOverride: (state, action) => {
      const orderId = action.payload;
      delete state.localOverrides[orderId];
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(getOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(getOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        // Assume payload handled by thunk might still be object or array
        const items = Array.isArray(action.payload) ? action.payload :
          (action.payload?.items || action.payload?.data || action.payload?.deliveries || []);
        
        state.items = items.map(item => {
          let s = item.statusDelivery?.toLowerCase() || '';
          if (s === 'restaurant_confirmed') item.statusDelivery = 'accepted';
          if (s === 'cancelled') item.statusDelivery = 'canceled';
          const id = item.deliveryId || item.id;
          const overr = state.localOverrides[id];
          if (overr) {
            item.deliveryStatus = overr.deliveryStatus;
            item.statusDelivery = overr.statusDelivery;
          }
          return item;
        });
      })
      .addCase(getOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(changeOrderStatus.fulfilled, (state, action) => {
        const { orderId, newStatusId } = action.payload;
        const index = state.items.findIndex(o => (o.deliveryId || o.id) === orderId);
        if (index !== -1) {
          state.items[index].deliveryStatus = newStatusId;
          state.items[index].statusDelivery = STATUSES_KEYS[newStatusId] || state.items[index].statusDelivery;
        }
        state.localOverrides[orderId] = {
          deliveryStatus: newStatusId,
          statusDelivery: STATUSES_KEYS[newStatusId],
        };
      })
      .addCase(changeOrderStatus.rejected, (state, action) => {
        const { orderId, oldStatusId } = action.payload || {};
        if (orderId == null || oldStatusId == null) return;
        const index = state.items.findIndex(o => (o.deliveryId || o.id) === orderId);
        if (index !== -1) {
          state.items[index].deliveryStatus = oldStatusId;
          state.items[index].statusDelivery = STATUSES_KEYS[oldStatusId] ?? state.items[index].statusDelivery;
        }
      })
      .addCase(purgeOrders.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(purgeOrders.fulfilled, (state) => {
        state.isLoading = false;
        // After a purge, we just empty everything locally
        state.items = [];
      })
      .addCase(purgeOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      });
  },
});

export const { setLocalStatusOverride, clearLocalStatusOverride } = ordersSlice.actions;
export default ordersSlice.reducer;
