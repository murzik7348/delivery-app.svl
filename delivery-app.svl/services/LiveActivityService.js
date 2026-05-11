import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Lazy import — avoids Android crashes
let _LA = null;
async function getLiveActivity() {
  if (_LA) return _LA;
  try {
    _LA = await import('expo-live-activity');
    return _LA;
  } catch (e) {
    console.warn('[LiveActivity] Module not available:', e.message);
    return null;
  }
}

// Module-level activityId (survives re-renders, lost on JS reload)
let _activityId = null;

// ── Status string/number → step 1-5 ──────────────────────────────────────────
const STRING_MAP = {
  created: 1, accepted: 1,
  preparing: 2,
  ready_for_pickup: 3, ready: 3,
  picked_up: 4, delivering: 4,
  delivered: 5, completed: 5,
  canceled: 0, cancelled: 0,
};
const NUM_MAP = { 0: 1, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 0 };

export function statusToStep(status) {
  if (status === null || status === undefined) return 0;
  const s = String(status).toLowerCase();
  const n = Number(s);
  if (!isNaN(n) && Number.isInteger(n)) return NUM_MAP[n] ?? 0;
  return STRING_MAP[s] ?? 0;
}

// ── Courier photo: download URL → local cache ─────────────────────────────────
async function downloadCourierPhoto(photoUrl, orderId) {
  if (!photoUrl || !photoUrl.startsWith('http')) return null;
  try {
    const fileName = `courier_photo_${orderId}.jpg`;
    const localPath = `${FileSystem.cacheDirectory}${fileName}`;
    const info = await FileSystem.getInfoAsync(localPath);
    if (!info.exists) {
      const result = await FileSystem.downloadAsync(photoUrl, localPath);
      if (result.status !== 200) return null;
    }
    return fileName; // Swift reads this from App Group via Image.dynamic
  } catch (e) {
    console.warn('[LiveActivity] Photo download failed:', e.message);
    return null;
  }
}

// ── Label helpers ─────────────────────────────────────────────────────────────
function getTitle(step) {
  return ['', 'Order Confirmed ✅', 'Preparing your food 🧑‍🍳',
    'Order is ready 📦', 'On the way 🛵', 'Order delivered 🏠'][step] ?? 'Delivery';
}
function getSubtitle(step) {
  return ['', 'Restaurant accepted your order.', 'Courier on the way.',
    'Waiting for courier pickup.', 'Order arriving soon.',
    'Enjoy your food!'][step] ?? '';
}

// ── Main API ──────────────────────────────────────────────────────────────────

/**
 * Call after every status poll or push notification.
 * Starts the Live Activity if not running; updates if already running.
 */
export async function syncLiveActivity(order) {
  return; // DYNAMIC ISLAND TEMPORARILY DISABLED
  if (Platform.OS !== 'ios') return;
  if (!order) return;

  const LA = await getLiveActivity();
  if (!LA) return;

  const orderId    = String(order.deliveryId || order.id || '0');
  const rawStatus  = order.statusDelivery ?? order.status ?? 'created';
  const step       = statusToStep(rawStatus);

  if (step === 0) { await endActivity(); return; }

  // Download photo only when courier is en route
  let courierPhotoFile = null;
  if (order.courierPhoto && step >= 4) {
    courierPhotoFile = await downloadCourierPhoto(order.courierPhoto, orderId);
  }

  // MM:SS countdown — compute timer end timestamp from estimatedMinutes
  const estMins    = Number(order.estimatedMinutes) || 0;
  const timerEndMs = estMins > 0 ? Date.now() + estMins * 60 * 1000 : undefined;

  const deliveryData = {
    restaurantName: order.restaurantName || 'Restaurant',
    statusText:     getSubtitle(step),
    timeRemaining:  String(estMins || ''),
    orderId,
    itemsCount:     (order.items || []).length,
    totalAmount:    `₴${Math.round(order.totalPrice || order.total || 0)}`,
    courierName:    order.courierName   || '',
    courierPhoto:   courierPhotoFile    || '',
    courierPhone:   order.courierPhone  || '',
    distance:       order.navigationStats?.toClientDistance || '',
    currentStep:    step,
  };

  const payload = {
    // ── New Flat Fields (Server/APNs compatible) ──────────────────────────
    status:          step,
    eta:             String(estMins || ''),
    courierName:     order.courierName   || '',
    courierPhoto:    courierPhotoFile    || '',
    courierPhone:    order.courierPhone  || '',
    restaurantName:  order.restaurantName || 'Restaurant',
    reservationTime: order.reservationTime || '',

    // ── Legacy Bridge Fields ──────────────────────────────────────────────
    title:    getTitle(step),
    subtitle: JSON.stringify(deliveryData),
    progress: step / 5,
    ...(timerEndMs ? { timerEndDateInMilliseconds: timerEndMs } : {}),
  };

  try {
    if (_activityId) {
      await LA.default.updateActivity(_activityId, payload);
    } else {
      _activityId = await LA.default.startActivity(payload);
    }
    console.log(`[LiveActivity] step=${step} synced ✓`);
  } catch (e) {
    // Activity may have expired — try fresh start
    console.warn('[LiveActivity] Update failed, retrying start:', e.message);
    try {
      _activityId = await LA.default.startActivity(payload);
    } catch (e2) {
      console.warn('[LiveActivity] startActivity failed:', e2.message);
      _activityId = null;
    }
  }
}

/** Call when order is delivered or cancelled */
export async function endActivity() {
  return; // DYNAMIC ISLAND TEMPORARILY DISABLED
  if (Platform.OS !== 'ios' || !_activityId) return;
  try {
    const LA = await getLiveActivity();
    if (LA) await LA.default.endActivity(_activityId);
    console.log('[LiveActivity] ended ✓');
  } catch (e) {
    console.warn('[LiveActivity] endActivity error:', e.message);
  } finally {
    _activityId = null;
  }
}

/** 
 * ── Global Polling ──────────────────────────────────────────────────────────
 * Managed polling that persists across screens.
 */
let _pollInterval = null;

export async function startPolling(orderId, fetchOrderFn) {
  return; // DYNAMIC ISLAND TEMPORARILY DISABLED
  if (_pollInterval) clearInterval(_pollInterval);
  
  const poll = async () => {
    console.log(`[LiveActivity] Polling order ${orderId}...`);
    try {
      const order = await fetchOrderFn(orderId);
      if (order) {
        await syncLiveActivity(order);
        const step = statusToStep(order.statusDelivery ?? order.status);
        if (step === 0 || step === 5) {
          console.log('[LiveActivity] Terminal state reached, stopping poll.');
          stopPolling();
        }
      }
    } catch (e) {
      console.warn('[LiveActivity] Polling error:', e.message);
    }
  };

  await poll(); 
  _pollInterval = setInterval(poll, 15000); 
}

export function stopPolling() {
  return; // DYNAMIC ISLAND TEMPORARILY DISABLED
  if (_pollInterval) {
    clearInterval(_pollInterval);
    _pollInterval = null;
    console.log('[LiveActivity] Polling stopped.');
  }
}

export default { syncLiveActivity, endActivity, statusToStep, startPolling, stopPolling };
