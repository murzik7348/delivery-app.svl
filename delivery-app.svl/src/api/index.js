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
    sendTestPushNotification,
    uploadAvatar,
    deleteMe,
} from './auth';

// ── Address ──────────────────────────────────────────────────────────────────
export {
    createAddress,
    getAddresses,
    setDefaultAddress,
    deleteAddress,
    getDeliveryAddress,
    getAddressTariff,
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
export {
    createDelivery,
    getMyDeliveries,
    acceptDelivery,
    userConfirmDelivery,
    getDeliveryZones,
    getDeliveryCoefficients,
    toggleDeliveryCoefficientActivityAdmin,
} from './delivery';

// ── Courier ──────────────────────────────────────────────────────────────────
export {
    getCourierDeliveries,
    getCourierDeliveriesMy,
    courierAcceptDelivery,
    courierBookDelivery,
    courierPickupDelivery,
    courierConfirmDelivery,
    courierSetOnlineStatus,
    getCourierShiftStatus,
    courierUpdateLocation,
} from './courier';

// ── Restaurant ───────────────────────────────────────────────────────────────
export {
    getRestaurantDeliveries,
    restaurantConfirmDelivery,
    restaurantCookingDelivery,
    restaurantReadyDelivery,
    restaurantCancelDelivery,
    getRestaurants,
} from './restaurant';



// ── Payment ──────────────────────────────────────────────────────────────────
export {
    getLiqPayCheckout,
} from './payment';

