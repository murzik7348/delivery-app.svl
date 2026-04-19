import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getCourierDeliveries,
  courierAcceptDelivery,
  courierBookDelivery,
  courierPickupDelivery,
  courierConfirmDelivery,
  getMyDeliveries,
} from '../src/api';

const initialState = {
  availableOrders: [],
  activeOrder: null, // The order currently being delivered by the courier
  completedOrders: [],
  isLoading: false,
  error: null,
  isOnline: false,
};

// Map backend delivery into UI model for the courier panel
const mapDeliveryToCourierOrder = (d) => ({
  id: d.deliveryId || d.id,
  courierId: d.courierId || d.courier?.userId || d.courier?.id,
  restaurantName: d.restaurantName || d.restaurant?.name || `Restaurant #${d.restaurantId ?? ''}`,
  address: (() => {
    const addr = d.address || d.customerAddress || d.deliveryAddress || d.addressText || d.customer?.address || d.customer?.deliveryAddress;
    if (typeof addr === 'string') return addr;
    if (typeof addr === 'object' && addr !== null) {
      return `${addr.street || addr.address || addr.name || addr.title || ''} ${addr.houseNumber || addr.house || ''}`.trim() || 'Address N/A';
    }
    return 'Address N/A';
  })(),
  customerName: d.customer?.fullName || d.customer?.name || d.user?.name || d.userName || 'Guest',
  customerPhone: d.customer?.phoneNumber || d.customer?.phone || d.user?.phoneNumber || d.user?.phone || d.userPhone || 'No phone',
  totalDistance: d.totalDistanceText || d.totalDistance || '—',
  totalPrice: d.totalPrice || d.total || 0,
  earnings: d.courierReward || d.totalPrice ? Math.round(d.totalPrice * 0.1) : 0, // Fallback estimation if reward not provided
  weight: d.total_weight_grams ? d.total_weight_grams / 1000 : null,
  navigationStats: {
    toShopTime: d.toShopTime || null,
    toShopDistance: d.toShopDistance || d.navigationStats?.toShopDistance || null,
    toClientTime: d.toClientTime || null,
    toClientDistance: d.toClientDistance || d.navigationStats?.toClientDistance || null,
  },
  cookingTimeMinutes: d.cookingTimeMinutes || d.prepTime || null,
  items: d.items?.map(i => ({
    name: i.productName || i.name || `Product #${i.productId ?? ''}`,
    quantity: i.quantity || i.qty || 1,
  })) ?? [],
  createdAt: d.createdAt || d.created_at || null,
  status: (() => {
    const s = d.statusDelivery ?? d.deliveryStatus ?? d.status;
    const num = Number(s);
    
    // Exact mapping to backend DeliveryStatus enum:
    // 0: created, 1: restaurant_confirmed, 2: preparing, 3: ready_for_pickup, 4: picked_up, 5: delivered, 6: cancelled
    if (num === 0 || s === 'created') return 'created';
    if (num === 1 || s === 'restaurant_confirmed' || s === 'accepted') return 'accepted';
    if (num === 2 || s === 'preparing') return 'preparing';
    if (num === 3 || s === 'ready_for_pickup' || s === 'ready') return 'ready_for_pickup';
    if (num === 4 || s === 'picked_up' || s === 'delivering') return 'delivering';
    if (num === 5 || s === 'delivered' || s === 'completed') return 'completed';
    if (num === 6 || s === 'cancelled' || s === 'canceled') return 'canceled';
    
    return s || 'pending';
  })(),
});

export const fetchCourierOrders = createAsyncThunk(
  'courier/fetchCourierOrders',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentUserId = state.auth.user?.userId || state.auth.user?.id;

      // Fetch all relevant statuses [0-6] in parallel for the courier pool.
      const statusPool = [0, 1, 2, 3, 4, 5, 6];
      console.log('🔄 [CourierSync] Starting parallel fetch for statuses:', statusPool);

      const results = await Promise.all(
        statusPool.map(async (s) => {
          try {
            const res = await getCourierDeliveries({ page: 1, pageSize: 50, deliveryStatus: s });
            const items = Array.isArray(res) ? res : (res?.items || res?.data || res?.deliveries || []);
            return items;
          } catch (e) {
            console.error(`❌ [CourierSync] Error fetching status ${s}:`, e.message);
            return [];
          }
        })
      );
      
      let list = results.flat();
      
      // Also fetch "my" deliveries (assigned to me)
      let myList = [];
      try {
        const myRes = await getMyDeliveries();
        myList = Array.isArray(myRes) ? myRes : (myRes?.items || myRes?.data || myRes?.deliveries || []);
        myList = myList.map(order => ({ ...order, courierId: currentUserId }));
      } catch (e) {
        console.error('❌ [CourierSync] Error fetching MY deliveries:', e.message);
      }
      
      const mergedMap = new Map();
      list.forEach(item => {
        const id = item.deliveryId || item.id;
        if (id) mergedMap.set(id, item);
      });
      myList.forEach(item => {
        const id = item.deliveryId || item.id;
        if (id) mergedMap.set(id, item);
      });
      list = Array.from(mergedMap.values());

      return {
        orders: list.map(mapDeliveryToCourierOrder),
        currentUserId
      };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to fetch courier deliveries');
    }
  }
);

export const courierAcceptOrderThunk = createAsyncThunk(
  'courier/acceptOrder',
  async (deliveryId, { rejectWithValue }) => {
    try {
      await courierAcceptDelivery(deliveryId);
      return { deliveryId };
    } catch (err) {
      const msg = err.data?.code || err.data?.message || err.message || 'Failed to accept delivery';
      return rejectWithValue(msg);
    }
  }
);

export const courierPickupOrderThunk = createAsyncThunk(
  'courier/pickupOrder',
  async (deliveryId, { rejectWithValue }) => {
    try {
      await courierPickupDelivery(deliveryId);
      return { deliveryId };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to pickup delivery');
    }
  }
);

export const courierConfirmOrderThunk = createAsyncThunk(
  'courier/confirmOrder',
  async (deliveryId, { rejectWithValue }) => {
    try {
      await courierConfirmDelivery(deliveryId);
      return { deliveryId };
    } catch (err) {
      return rejectWithValue(err.message || 'Failed to confirm delivery');
    }
  }
);

const courierSlice = createSlice({
  name: 'courier',
  initialState,
  reducers: {
    setAvailableOrders: (state, action) => {
      state.availableOrders = action.payload;
    },
    acceptOrder: (state, action) => {
      const orderId = action.payload;
      const orderToAccept = state.availableOrders.find(o => o.id === orderId);

      if (orderToAccept && !state.activeOrder) {
        state.activeOrder = { ...orderToAccept, status: 'accepted' };
        state.availableOrders = state.availableOrders.filter(o => o.id !== orderId);
      }
    },
    updateActiveOrderStatus: (state, action) => {
      if (state.activeOrder) {
        state.activeOrder.status = action.payload;
      }
    },
    completeActiveOrder: (state, action) => {
      if (state.activeOrder) {
        state.completedOrders.push({ ...state.activeOrder, status: 'completed' });
        state.activeOrder = null;
      }
    },
    clearCourierState: (state) => {
      state.activeOrder = null;
      state.availableOrders = [];
      state.completedOrders = [];
      state.isOnline = false;
    },
    setOnlineStatus: (state, action) => {
      state.isOnline = action.payload;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCourierOrders.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCourierOrders.fulfilled, (state, action) => {
        state.isLoading = false;
        const { orders, currentUserId } = action.payload;

        // Available Pool: Show orders that are restaurant_confirmed (1), Preparing (2) or Ready (3)
        // AND have no courier assigned yet
        state.availableOrders = orders.filter(o =>
          (!o.courierId || o.courierId === 0 || o.courierId === '0') &&
          ['accepted', 'preparing', 'ready_for_pickup'].includes(o.status)
        );

        // Active Task: Assigned to THIS courier and matches active statuses
        const active = orders.find(o =>
          (Number(o.courierId) === Number(currentUserId)) &&
          (o.status !== 'completed' && o.status !== 'canceled')
        );

        // Completed History: Assigned to THIS courier and matches completed
        state.completedOrders = orders.filter(o =>
          (Number(o.courierId) === Number(currentUserId)) && (o.status === 'completed')
        ).sort((a, b) => b.id - a.id);

        if (active) {
          state.activeOrder = active;
        } else {
          // PROTECTION: If we have an active order locally that is NOT completed/canceled, 
          // do NOT wipe it just because a background fetch (which might be stale) didn't return it.
          // This prevents the 'flicker' where an order disappears for 1 second after 'Accept'.
          if (state.activeOrder && state.activeOrder.status !== 'completed' && state.activeOrder.status !== 'canceled') {
            console.log('🛡️ [CourierSync] Preserving local active order during potentially stale background fetch');
          } else {
            state.activeOrder = null;
          }
        }
      })
      .addCase(fetchCourierOrders.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload || 'Failed to fetch courier deliveries';
      })
      .addCase(courierAcceptOrderThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(courierAcceptOrderThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        const id = action.payload?.deliveryId;
        const idx = state.availableOrders.findIndex(o => o.id === id);
        if (idx !== -1 && !state.activeOrder) {
          const order = state.availableOrders[idx];
          state.activeOrder = { ...order, status: 'accepted' };
          state.availableOrders.splice(idx, 1);
        }
      })
      .addCase(courierAcceptOrderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(courierPickupOrderThunk.fulfilled, (state) => {
        if (state.activeOrder) {
          state.activeOrder.status = 'picked_up';
        }
      })
      .addCase(courierConfirmOrderThunk.fulfilled, (state) => {
        if (state.activeOrder) {
          state.completedOrders.push({ ...state.activeOrder, status: 'completed' });
          state.activeOrder = null;
        }
      })
      // Clear Entire state on logout
      .addCase('auth/logoutUser', () => initialState);
  },
});

export const {
  setAvailableOrders,
  acceptOrder,
  updateActiveOrderStatus,
  completeActiveOrder,
  clearCourierState,
  setOnlineStatus
} = courierSlice.actions;

export default courierSlice.reducer;
