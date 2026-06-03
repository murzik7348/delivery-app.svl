import client, { saveToken, removeToken } from './client';

/**
 * Step 1 – Send phone / email to receive an OTP.
 * @param {Object} data - AuthStartRequest { phone: string }
 */
export const authStart = (data) => client.post('/auth/start', data);

/**
 * Step 2 – Verify OTP code.
 * @param {Object} data - AuthVerifyRequest { phone: string, code: string }
 * @returns token on success; call saveToken() to persist it.
 */
export const authVerify = async (data) => {
    const response = await client.post('/auth/verify', data);
    const token = typeof response === 'string' ? response : (response?.accessToken || response?.token);
    const refreshToken = response?.refreshToken || response?.refresh_token;
    if (token) {
        await saveToken(token, refreshToken);
    }
    return response;
};

/**
 * Set / update password.
 * @param {Object} data - AuthSetPasswordRequest { password: string }
 */
export const authSetPassword = async (data) => {
    const response = await client.post('/auth/set-password', data);
    const token = typeof response === 'string' ? response : (response?.accessToken || response?.token);
    const refreshToken = response?.refreshToken || response?.refresh_token;
    if (token) {
        await saveToken(token, refreshToken);
    }
    return response;
};

/**
 * Refresh access token using a refresh token.
 * @param {Object} data - AuthRefreshRequest { refreshToken: string }
 * @returns new token; persisted automatically.
 */
export const authRefresh = async (data) => {
    const response = await client.post('/auth/refresh', data);
    const token = typeof response === 'string' ? response : (response?.accessToken || response?.token);
    const refreshToken = response?.refreshToken || response?.refresh_token;
    if (token) {
        await saveToken(token, refreshToken);
    }
    return response;
};

/**
 * Classic email + password login.
 * @param {Object} data - AuthLoginRequest { email: string, password: string }
 * @returns response with JWT; stored automatically.
 */
export const authLogin = async (data) => {
    const response = await client.post('/auth/login', data);
    const token = typeof response === 'string' ? response : (response?.accessToken || response?.token);
    const refreshToken = response?.refreshToken || response?.refresh_token;
    if (token) {
        await saveToken(token, refreshToken);
    }
    return response;
};

/**
 * Get the currently authenticated user's profile.
 * @param {Object} config - Optional axios configuration.
 */
export const getMe = (config = {}) => client.get('/auth/me', config);

/**
 * Helper – clear persisted token on logout.
 */
export const logout = () => removeToken();

/**
  * Update the user's Push Notification token.
 * @param {string} token - Expo Push Token
 */
export const updatePushToken = async (token) => {
    try {
        return await client.post('/notifications/token', { token });
    } catch (err) {
        if (err.status === 404) {
            console.warn('⚠️ [PushToken] Endpoint /notifications/token not found on backend. Skipping sync.');
            return null;
        }
        throw err;
    }
};

/**
 * Send a test push notification from the server.
 * @param {string} message - Message body
 */
export const sendTestPushNotification = async (message) => {
    return await client.post('/notifications/test', JSON.stringify(message));
};
/**
 * Upload profile photo (avatar).
 * @param {FormData} formData - Multipart form data containing 'Photo'
 */
export const uploadAvatar = (formData) =>
    client.post('/auth/photo', formData, {
        headers: {
            'Content-Type': 'multipart/form-data',
        },
    });
