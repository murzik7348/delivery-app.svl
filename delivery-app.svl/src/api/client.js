import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getStore } from './storeRef';

// ─── Change this to your real backend URL ───────────────────────────────────
export const BASE_URL = 'http://37.27.220.44';
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = '@delivery_app_token';
export const REFRESH_TOKEN_KEY = '@delivery_app_refresh_token';

/** Persist the JWT after a successful login / verify */
export const saveToken = async (token, refreshToken) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
        await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

/** Clear the JWT on logout */
export const removeToken = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
};

/** Read the JWT (used inside the interceptor) */
export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => AsyncStorage.getItem(REFRESH_TOKEN_KEY);

/** Resolve a relative image path from the backend to a full URL */
export const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    // Ensure path doesn't start with double slashes if BASE_URL ends with one
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL : `${BASE_URL}/`;
    
    return `${cleanBase}${cleanPath}`;
};

// ─── Axios instance ──────────────────────────────────────────────────────────
const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token automatically & Logging ───────
client.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }

        console.log(`\n============== 🚀 API REQUEST 🚀 ==============`);
        console.log(`URL: ${config.baseURL || ''}${config.url}`);
        console.log(`Method: ${config.method?.toUpperCase()}`);
        console.log(`Headers:`, JSON.stringify(config.headers || {}, null, 2));
        if (config.data) {
            console.log(`Body:`, JSON.stringify(config.data, null, 2));
        }
        console.log(`===============================================\n`);

        return config;
    },
    (error) => {
        console.log(`\n============== ❌ API REQUEST ERROR ❌ ==============`);
        console.error(error);
        console.log(`=====================================================\n`);
        return Promise.reject(error);
    },
);

// ── Response interceptor: unwrap data & normalise errors ─────────────────────
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

client.interceptors.response.use(
    (response) => {
        console.log(`\n============== ✅ API RESPONSE ✅ ==============`);
        console.log(`URL: ${response.config?.url}`);
        console.log(`Status: ${response.status}`);
        try {
            const dataStr = JSON.stringify(response.data, null, 2) || '';
            console.log(`Data:`, dataStr.length > 500 ? dataStr.substring(0, 500) + '... (truncated)' : dataStr);
        } catch (e) {
            console.log(`Data: [Unserializable]`);
        }
        console.log(`================================================\n`);
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // Auto-logout/Refresh logic
        if (error.response?.status === 401 && !originalRequest._retry && !originalRequest?._skipLogout) {
            
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = 'Bearer ' + token;
                    return client(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = await getRefreshToken();
            if (refreshToken) {
                try {
                    console.log('🔄 [Mobile] Attempting to refresh token...');
                    
                    // Note: original axios is used to avoid interceptor recursion
                    const response = await axios.post(`${BASE_URL}/auth/refresh`, 
                        { refreshToken },
                        { headers: { 'Content-Type': 'application/json' } }
                    );

                    console.log('✅ [Mobile] Token refresh success:', typeof response.data);

                    // Normalize token extraction
                    const newToken = typeof response.data === 'string' ? response.data : response.data.accessToken;
                    const newRefreshToken = response.data.refreshToken || refreshToken;

                    if (newToken) {
                        await saveToken(newToken, newRefreshToken);
                        
                        // Update defaults for future requests
                        client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                        
                        processQueue(null, newToken);
                        
                        // Update current request
                        originalRequest.headers.Authorization = `Bearer ${newToken}`;
                        return client(originalRequest);
                    } else {
                        throw new Error('No token returned from refresh endpoint');
                    }
                } catch (refreshError) {
                    const status = refreshError.response?.status;
                    const data = refreshError.response?.data;
                    console.error(`❌ [Mobile] Token refresh failed (Status: ${status}):`, 
                        JSON.stringify(data || refreshError.message, null, 2)
                    );
                    
                    processQueue(refreshError, null);
                    await removeToken().catch(() => {});
                    
                    const store = getStore();
                    if (store) {
                        const { logoutUser } = require('../../store/authSlice');
                        store.dispatch(logoutUser());
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.warn('⚠️ [Mobile] No refresh token available, skipping refresh attempt.');
            }
        }

        console.log(`\n============== ❌ API ERROR RESPONSE ❌ ==============`);
        if (error.response) {
            console.log(`URL: ${error.config?.url}`);
            console.log(`Status: ${error.response.status}`);
            console.log(`Response Data:`, JSON.stringify(error.response.data || {}, null, 2));
            console.log(`======================================================\n`);

            // Auto-logout as last resort if no refresh possible
            if (
                error.response.status === 401 &&
                error.config?.headers?.Authorization &&
                !error.config?._skipLogout
            ) {
                await removeToken().catch(() => { });
                const store = getStore();
                if (store) {
                    const { logoutUser } = require('../../store/authSlice');
                    store.dispatch(logoutUser());
                }
            }
            const apiError = new Error(
                error.response.data?.message || 'Server error. Please try again.',
            );
            apiError.status = error.response.status;
            apiError.data = error.response.data;
            return Promise.reject(apiError);
        }
        if (error.request) {
            console.error('[Axios Request Error]', error.message, error.config?.url);
            return Promise.reject(
                new Error(`No connection to server. Check your internet. (${error.message})`),
            );
        }
        console.error('[Axios Error]', error.message);
        return Promise.reject(error);
    },
);

export default client;
