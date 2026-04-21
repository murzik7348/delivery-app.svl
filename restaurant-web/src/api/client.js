import axios from 'axios';
import { logService } from './logService';

// Use Local proxy defined in vite.config.js to bypass CORS
export const BASE_URL = '/api';
export const IMAGE_BASE_URL = 'http://37.27.220.44';
export const DIRECT_API_URL = 'http://37.27.220.44';

export const TOKEN_KEY = '@admin_app_token';
export const REFRESH_TOKEN_KEY = '@admin_app_refresh_token';

// Use LocalStorage instead of AsyncStorage
export const saveToken = (token, refreshToken) => {
    localStorage.setItem(TOKEN_KEY, token);
    if (refreshToken) {
        localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
    }
};

export const removeToken = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
};

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);

/** Resolve a relative image path from the backend to a full URL */
export const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    
    const cleanPath = path.startsWith('/') ? path.substring(1) : path;
    const cleanBase = IMAGE_BASE_URL.endsWith('/') ? IMAGE_BASE_URL : `${IMAGE_BASE_URL}/`;
    
    return `${cleanBase}${cleanPath}`;
};

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 60000,
    headers: { 'Content-Type': 'application/json' },
});

// Add Bearer token to all requests
client.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log(`=====================================================\n`);
        return config;
    },
    (error) => Promise.reject(error)
);

// Handle responses and 401s
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
        console.log(`URL: ${response.config?.url}`);
        console.log(`HTTP Status: ${response.status}`);
        console.log(`Data:`, response.data);
        console.log(`==========================================================\n`);
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers['Authorization'] = 'Bearer ' + token;
                    return client(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            const refreshToken = getRefreshToken();
            if (refreshToken) {
                try {
                    console.log('🔄 Attempting to refresh token...');
                    const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
                    const newToken = typeof response.data === 'string' ? response.data : response.data.accessToken;
                    const newRefreshToken = response.data.refreshToken;

                    if (newToken) {
                        saveToken(newToken, newRefreshToken);
                        client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
                        originalRequest.headers['Authorization'] = `Bearer ${newToken}`;
                        processQueue(null, newToken);
                        return client(originalRequest);
                    }
                } catch (refreshError) {
                    console.error('❌ Token refresh failed:', refreshError);
                    processQueue(refreshError, null);
                    removeToken();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                removeToken();
                if (window.location.pathname !== '/login') {
                    window.location.href = '/login';
                }
            }
        }

        console.group(`%c============== ❌ RESTAURANT API ERROR ❌ ==============`, 'color: #ef4444; font-weight: bold;');
        if (error.response) {
            console.log(`URL: ${error.config?.url}`);
            console.log(`HTTP Status: ${error.response.status}`);
            console.log(`Method: ${error.config?.method?.toUpperCase()}`);
            console.log(`Full Response Data:`, error.response.data);
            
            // Log specific validation errors if present
            if (error.response.data?.errors) {
                console.group('%c[VALIDATION ERRORS]', 'color: #fca5a5; font-weight: bold;');
                Object.entries(error.response.data.errors).forEach(([field, messages]) => {
                    console.log(`%c${field}:`, 'font-weight: bold;', messages);
                });
                console.groupEnd();
            }

            // Log specific error codes if present
            if (error.response.data?.code) {
                console.log(`%c[ERROR CODE]: ${error.response.data.code}`, 'color: #fca5a5; font-weight: bold;');
            }
            console.log(`%c[ERROR MESSAGE]: ${error.response.data.message}`, 'color: #fca5a5;');

            logService.addLog({
                type: 'error',
                status: error.response.status,
                url: error.config?.url,
                method: error.config?.method?.toUpperCase(),
                data: error.response.data
            });

            const apiError = new Error(
                error.response.data?.message || `Помилка сервера (${error.response.status}).`
            );
            apiError.status = error.response.status;
            apiError.data = error.response.data;
            console.groupEnd();
            return Promise.reject(apiError);
        }
        
        if (error.request) {
            console.log('No response received from server (Network or Proxy Error)');
            console.log(`URL: ${error.config?.url}`);
            console.groupEnd();
            
            if (originalRequest.method === 'get') {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Помилка підключення до сервера. Перевірте інтернет.'));
        }
        console.log(`Message: ${error.message}`);
        console.groupEnd();
        return Promise.reject(error);
    }
);

export default client;
