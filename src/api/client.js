import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';

// ─── Change this to your real backend URL ───────────────────────────────────
export const BASE_URL = 'http://37.27.220.44';
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = '@delivery_app_token';

/** Persist the JWT after a successful login / verify */
export const saveToken = async (token) => {
    await AsyncStorage.setItem(TOKEN_KEY, token);
};

/** Clear the JWT on logout */
export const removeToken = async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
};

/** Read the JWT (used inside the interceptor) */
export const getToken = () => AsyncStorage.getItem(TOKEN_KEY);

// ─── Axios instance ──────────────────────────────────────────────────────────
const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// ── Request interceptor: attach Bearer token automatically ───────────────────
client.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error),
);

// ── Response interceptor: unwrap data & normalise errors ─────────────────────
client.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response) {
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
