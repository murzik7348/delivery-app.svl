import axios from 'axios';

// Use Local proxy defined in vite.config.js to bypass CORS
export const BASE_URL = '/api';

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

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 15000,
    headers: { 'Content-Type': 'application/json' },
});

// Add Bearer token to all requests
client.interceptors.request.use(
    (config) => {
        const token = getToken();
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        console.log(`\n============== 🚀 ADMIN API REQUEST 🚀 ==============`);
        console.log(`URL: ${config.baseURL || ''}${config.url}`);
        console.log(`Method: ${config.method?.toUpperCase()}`);
        console.log(`Auth Header: ${config.headers['Authorization'] ? config.headers['Authorization'].substring(0, 15) + '...' : 'NONE'}`);
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
        console.log(`\n============== ✅ ADMIN API RESPONSE ✅ ==============`);
        console.log(`URL: ${response.config?.url}`);
        console.log(`Status: ${response.status}`);
        console.log(`======================================================\n`);
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
                    // Use axios directly to avoid interceptors loop or use a flag
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

        console.log(`\n============== ❌ ADMIN API ERROR ❌ ==============`);
        if (error.response) {
            console.log(`URL: ${error.config?.url}`);
            console.log(`Status: ${error.response.status}`);
            console.log(`Data:`, error.response.data);

            const errorMsg = error.response.data?.message || '';
            const isClaimMissing = errorMsg.includes('UserId claim missing');

            if (isClaimMissing) {
                console.error('CRITICAL: Backend rejected token because "UserId" claim is missing.');
            }

            const apiError = new Error(
                error.response.data?.message || 'Server error. Please try again.'
            );
            apiError.status = error.response.status;
            apiError.data = error.response.data;
            console.log(`====================================================\n`);
            return Promise.reject(apiError);
        }
        
        if (error.request) {
            // These are often momentary Vite proxy disconnects or polling timeouts
            console.log('No response received from server (Network or Proxy Error)');
            console.log(`====================================================\n`);
            
            // If it's a background GET request (like polling), just return empty array
            // instead of crashing or showing a huge error if it's intermittent
            if (originalRequest.method === 'get') {
                return Promise.resolve({ data: [] });
            }
            return Promise.reject(new Error('Помилка підключення до сервера. Перевірте інтернет.'));
        }
        console.log(`====================================================\n`);
        return Promise.reject(error);
    }
);

export default client;
