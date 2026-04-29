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
    updatePushToken,
    uploadAvatar,
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
    uploadProductImage,
    deleteProductImage,
} from './product';

// ── Delivery ─────────────────────────────────────────────────────────────────
export { createDelivery, getMyDeliveries, acceptDelivery } from './delivery';

// ── Courier ──────────────────────────────────────────────────────────────────
export {
    getCourierDeliveries,
    getCourierDeliveriesMy,
    courierAcceptDelivery,
    courierBookDelivery,
    courierPickupDelivery,
    courierConfirmDelivery,
    courierSetOnlineStatus,
    courierUpdateLocation,
} from './courier';

// ── Restaurant ───────────────────────────────────────────────────────────────
export {
    getRestaurantDeliveries,
    restaurantConfirmDelivery,
    restaurantCancelDelivery,
    getRestaurants,
} from './restaurant';



// ── Payment ──────────────────────────────────────────────────────────────────
export {
    getLiqPayCheckout,
} from './payment';

