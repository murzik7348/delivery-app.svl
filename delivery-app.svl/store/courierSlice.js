import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getCourierDeliveries,
  getCourierDeliveriesMy,
  courierAcceptDelivery,
  courierBookDelivery,
  courierPickupDelivery,
  courierConfirmDelivery,
} from '../src/api';

const initialState = {
  availableOrders: [],
  activeOrders: [], // Orders currently being delivered by the courier
  completedOrders: [],
  isLoading: false,
  error: null,
  isOnline: false,
};

// Map backend delivery into UI model for the courier panel
const mapDeliveryToCourierOrder = (d, currentUserId) => {
  const courierId = d.courierId || d.courier_id || d.courier?.userId || d.courier?.id || d.courier?.user_id || 0;
  const isBooked = !!(
    d.isBooked || 
    d.is_booked || 
    courierId || 
    (d.courier && Object.keys(d.courier).length > 0)
  );
  const isMine = Number(courierId) === Number(currentUserId) && currentUserId !== undefined;

  return {
    id: d.deliveryId || d.id,
    courierId,
    isBooked,
    isMine,
    isBookedByOther: isBooked && !isMine,
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
    earnings: d.courierReward || (d.totalPrice ? Math.round(d.totalPrice * 0.1) : 0),
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
  };
};

export const fetchCourierOrders = createAsyncThunk(
  'courier/fetchCourierOrders',
  async (_, { getState, rejectWithValue }) => {
    try {
      const state = getState();
      const currentUserId = state.auth.user?.userId || state.auth.user?.id;

      // Fetch all relevant statuses [0-6] in parallel for the courier pool.
      const statusPool = [0, 1, 2, 3, 4, 5, 6];
      console.log('🔄 [CourierSync] Starting parallel fetch for statuses:', statusPool);

      const [poolResults, myResponse] = await Promise.all([
        Promise.all(
          statusPool.map(async (s) => {
            try {
              const res = await getCourierDeliveries({ page: 1, pageSize: 50, deliveryStatus: s });
              return Array.isArray(res) ? res : (res?.items || res?.data || res?.deliveries || []);
            } catch (e) {
              console.error(`❌ [CourierSync] Error fetching status ${s}:`, e.message);
              return [];
            }
          })
        ),
        getCourierDeliveriesMy().catch(e => {
          console.error('❌ [CourierSync] Error fetching /courier/deliveries/my:', e.message);
          return null;
        })
      ]);

      const myAssignedOrders = Array.isArray(myResponse) ? myResponse : (myResponse?.data?.items || myResponse?.data || myResponse?.deliveries || []);
      console.log(`✅ [CourierSync] Fetched ${myAssignedOrders.length} personal deliveries`);

      const mergedMap = new Map();
      
      // Add general pool items
      poolResults.flat().forEach(item => {
        const id = item.deliveryId || item.id;
        if (id) mergedMap.set(id, item);
      });
      
      // Add specifically assigned items (they might be in the pool too, but we prioritize /my data)
      myAssignedOrders.forEach(item => {
        const id = item.deliveryId || item.id;
        if (id) mergedMap.set(id, item);
      });

      const list = Array.from(mergedMap.values());
      console.log(`📊 [CourierSync] Total unique orders processed: ${list.length}`);

      return {
        orders: list.map(item => mapDeliveryToCourierOrder(item, currentUserId)),
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
      // Improved error parsing for Axios responses
      const errorData = err.response?.data || err.data;
      const msg = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.code || errorData?.message || errorData?.detail || err.message || 'Failed to accept delivery');
      
      console.warn('❌ [CourierAction] Accept failed:', msg);
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

      if (orderToAccept) {
        state.activeOrders.push({ ...orderToAccept, status: 'accepted' });
        state.availableOrders = state.availableOrders.filter(o => o.id !== orderId);
      }
    },
    updateActiveOrderStatus: (state, action) => {
      const { orderId, status } = action.payload;
      const order = state.activeOrders.find(o => o.id === orderId);
      if (order) {
        order.status = status;
      }
    },
    completeActiveOrder: (state, action) => {
      const orderId = action.payload;
      const order = state.activeOrders.find(o => o.id === orderId);
      if (order) {
        state.completedOrders.push({ ...order, status: 'completed' });
        state.activeOrders = state.activeOrders.filter(o => o.id !== orderId);
      }
    },
    clearCourierState: (state) => {
      state.activeOrders = [];
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

        // Available Pool: Show orders that are restaurant_confirmed (1), Preparing (2) or Ready (3).
        // Exclude orders assigned to THIS courier (they go to Active Task), but include others' booked orders so they see "Заброньовано".
        state.availableOrders = orders.filter(o =>
          (Number(o.courierId) !== Number(currentUserId)) &&
          ['created', 'accepted', 'preparing', 'ready_for_pickup'].includes(o.status)
        );

        // Active Tasks: Assigned to THIS courier and matches active statuses
        const fetchedActive = orders.filter(o =>
          (Number(o.courierId) === Number(currentUserId)) &&
          (o.status !== 'completed' && o.status !== 'canceled')
        );

        // PROTECTION: Keep local active orders that are NOT in the fetched list yet 
        // (e.g. optimistic updates or temporary backend inconsistency)
        const fetchedIds = new Set(fetchedActive.map(o => o.id));
        const localStillActive = (state.activeOrders || []).filter(local => 
          !fetchedIds.has(local.id) && 
          local.status !== 'completed' && 
          local.status !== 'canceled'
        );

        state.activeOrders = [...fetchedActive, ...localStillActive];

        // Completed History: Assigned to THIS courier and matches completed
        state.completedOrders = orders.filter(o =>
          (Number(o.courierId) === Number(currentUserId)) && (o.status === 'completed')
        ).sort((a, b) => b.id - a.id);
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
        if (!Array.isArray(state.activeOrders)) state.activeOrders = [];
        if (!Array.isArray(state.availableOrders)) state.availableOrders = [];
        
        const idx = state.availableOrders.findIndex(o => o.id === id);
        if (idx !== -1) {
          const order = state.availableOrders[idx];
          state.activeOrders.push({ ...order, status: 'accepted' });
          state.availableOrders.splice(idx, 1);
        }
      })
      .addCase(courierAcceptOrderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(courierPickupOrderThunk.fulfilled, (state, action) => {
        const id = action.payload?.deliveryId;
        const order = state.activeOrders.find(o => o.id === id);
        if (order) {
          order.status = 'picked_up';
        }
      })
      .addCase(courierConfirmOrderThunk.fulfilled, (state, action) => {
        const id = action.payload?.deliveryId;
        const orderIdx = state.activeOrders.findIndex(o => o.id === id);
        if (orderIdx !== -1) {
          const order = state.activeOrders[orderIdx];
          state.completedOrders.push({ ...order, status: 'completed' });
          state.activeOrders.splice(orderIdx, 1);
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
