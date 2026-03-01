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
    if (response?.token) {
        await saveToken(response.token);
    }
    return response;
};

/**
 * Set / update password.
 * @param {Object} data - AuthSetPasswordRequest { password: string }
 */
export const authSetPassword = (data) => client.post('/auth/set-password', data);

/**
 * Refresh access token using a refresh token.
 * @param {Object} data - AuthRefreshRequest { refreshToken: string }
 * @returns new token; persisted automatically.
 */
export const authRefresh = async (data) => {
    const response = await client.post('/auth/refresh', data);
    if (response?.token) {
        await saveToken(response.token);
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
    if (response?.token) {
        await saveToken(response.token);
    }
    return response;
};

/**
 * Get the currently authenticated user's profile.
 */
export const getMe = () => client.get('/auth/me');

/**
 * Helper – clear persisted token on logout.
 */
export const logout = () => removeToken();
