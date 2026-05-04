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
  const isMine = d._fromMy === true || (Number(d.courierId || d.courier_id || d.courier?.userId || d.courier?.id || d.courier?.user_id || 0) === Number(currentUserId) && currentUserId !== undefined);
  const courierId = isMine ? currentUserId : (d.courierId || d.courier_id || d.courier?.userId || d.courier?.id || d.courier?.user_id || 0);
  const isBooked = !!(
    isMine ||
    d.isBooked || 
    d.is_booked || 
    d.courierId || 
    (d.courier && Object.keys(d.courier).length > 0)
  );

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
      
      // Exact mapping to DB DeliveryStatus enum (0-6):
      if (num === 0 || s === 'created') return 'created';
      if (num === 1 || s === 'accepted') return 'accepted';
      if (num === 2 || s === 'preparing') return 'preparing';
      if (num === 3 || s === 'ready_for_pickup' || s === 'ready') return 'ready_for_pickup';
      if (num === 4 || s === 'picked_up' || s === 'delivering') return 'delivering'; 
      if (num === 5 || s === 'delivered' || s === 'completed') return 'completed';
      if (num === 6 || s === 'canceled' || s === 'cancelled') return 'canceled';
      
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

      // TWO targeted requests:
      // 1. GET /courier/deliveries — returns only FREE (unassigned) orders from the backend
      // 2. GET /courier/deliveries/my?deliveryStatus=3 — returns orders assigned to THIS courier (status=3: TakenByCourier)
      const [availableResponse, myResponse] = await Promise.all([
        getCourierDeliveries({ page: 1, pageSize: 50, _quiet: true }).catch(e => {
          console.error('❌ [CourierSync] Error fetching /courier/deliveries:', e.message);
          return null;
        }),
        getCourierDeliveriesMy({ page: 1, pageSize: 50, _quiet: true }).catch(e => {
          console.error('❌ [CourierSync] Error fetching /courier/deliveries/my:', e.message);
          return null;
        }),
      ]);

      const availableItems = Array.isArray(availableResponse)
        ? availableResponse
        : (availableResponse?.items || availableResponse?.data?.items || availableResponse?.data || availableResponse?.deliveries || []);

      const myAssignedOrders = Array.isArray(myResponse)
        ? myResponse
        : (myResponse?.items || myResponse?.data?.items || myResponse?.data || myResponse?.deliveries || []);

      // Map available orders (not mine)
      const availableMapped = availableItems
        .filter(item => (item.deliveryId || item.id))
        .map(item => mapDeliveryToCourierOrder({ ...item, _fromMy: false }, currentUserId));

      // Map my assigned orders
      const myMapped = myAssignedOrders
        .filter(item => (item.deliveryId || item.id))
        .map(item => mapDeliveryToCourierOrder({ ...item, _fromMy: true }, currentUserId));

      return {
        availableOrders: availableMapped,
        myOrders: myMapped,
        currentUserId,
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
      const errorData = err.response?.data || err.data;
      const msg = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.code || errorData?.message || errorData?.detail || err.message || 'Failed to pickup delivery');
      return rejectWithValue(msg);
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
      const errorData = err.response?.data || err.data;
      const msg = typeof errorData === 'string' 
        ? errorData 
        : (errorData?.code || errorData?.message || errorData?.detail || err.message || 'Failed to confirm delivery');
      return rejectWithValue(msg);
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
        const { availableOrders, myOrders, currentUserId } = action.payload;

        // Available pool — directly from GET /courier/deliveries (already filtered by backend)
        state.availableOrders = availableOrders;

        // Active tasks — from GET /courier/deliveries/my?deliveryStatus=3
        // These are orders currently assigned to THIS courier.
        state.activeOrders = myOrders.filter(
          o => o.status !== 'completed' && o.status !== 'canceled'
        );

        // Completed history
        state.completedOrders = myOrders
          .filter(o => o.status === 'completed')
          .sort((a, b) => b.id - a.id);
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
      .addCase('auth/logoutUser', () => initialState)
      .addCase('auth/loginUser', () => initialState);
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
