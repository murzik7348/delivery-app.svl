// ── Base client & token helpers ──────────────────────────────────────────────
export { default as client, saveToken, removeToken, getToken } from './client';

// ── Auth ─────────────────────────────────────────────────────────────────────
export {
    authStart,
    authVerify,
    authSetPassword,
    authRefresh,
    authLogin,
    getMe,
    logout,
} from './auth';

// ── Address ──────────────────────────────────────────────────────────────────
export {
    createAddress,
    getAddresses,
    setDefaultAddress,
    deleteAddress,
} from './address';

// ── Category ─────────────────────────────────────────────────────────────────
export { getCategories, createCategory, updateCategory } from './category';

// ── Product ──────────────────────────────────────────────────────────────────
export {
    createProduct,
    getProducts,
    updateProduct,
    deleteProduct,
} from './product';

// ── Delivery ─────────────────────────────────────────────────────────────────
export { createDelivery, getMyDeliveries, acceptDelivery } from './delivery';

// ── Courier ──────────────────────────────────────────────────────────────────
export {
    getCourierDeliveries,
    courierAcceptDelivery,
    courierPickupDelivery,
    courierConfirmDelivery,
} from './courier';

// ── Restaurant ───────────────────────────────────────────────────────────────
export {
    getRestaurantDeliveries,
    restaurantConfirmDelivery,
    restaurantCancelDelivery,
} from './restaurant';
