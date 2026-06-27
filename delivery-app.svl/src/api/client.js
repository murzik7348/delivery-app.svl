import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import { getStore } from './storeRef';

// ─── Change this to your real backend URL ───────────────────────────────────
export const BASE_URL = 'https://api.andi.delivery';
// ─────────────────────────────────────────────────────────────────────────────

export const TOKEN_KEY = 'delivery_app_token';
export const REFRESH_TOKEN_KEY = 'delivery_app_refresh_token';

const isWeb = Platform.OS === 'web';

/** Persist the JWT after a successful login / verify */
export const saveToken = async (token, refreshToken) => {
    if (isWeb) {
        await AsyncStorage.setItem(TOKEN_KEY, token);
        if (refreshToken) {
            await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
    } else {
        await SecureStore.setItemAsync(TOKEN_KEY, token);
        if (refreshToken) {
            await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
        }
    }
};

/** Clear the JWT on logout */
export const removeToken = async () => {
    if (isWeb) {
        await AsyncStorage.removeItem(TOKEN_KEY);
        await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
    } else {
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    }
};

/** Read the JWT (used inside the interceptor) */
export const getToken = async () => {
    if (isWeb) {
        return AsyncStorage.getItem(TOKEN_KEY);
    } else {
        return SecureStore.getItemAsync(TOKEN_KEY);
    }
};

export const getRefreshToken = async () => {
    if (isWeb) {
        return AsyncStorage.getItem(REFRESH_TOKEN_KEY);
    } else {
        return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    }
};

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

        // Minimal logging for development if not in quiet mode
        if (!config._quiet) {
            console.log(`📡 [API] ${config.method?.toUpperCase()} ${config.url}`);
        }

        return config;
    },
    (error) => {
        console.error(`❌ [API Request Error]`, error);
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
        // Reset offline status on any successful API call
        const store = getStore();
        if (store) {
            const { setOffline } = require('../../store/uiSlice');
            store.dispatch(setOffline(false));
        }
        return response.data;
    },
    async (error) => {
        const originalRequest = error.config;

        // Auto-retry for GET requests on transient network or 5xx server issues
        const isGetRequest = originalRequest && originalRequest.method?.toLowerCase() === 'get';
        const isNetworkOr5xxError = !error.response || (error.response.status >= 500 && error.response.status <= 504);

        if (isGetRequest && isNetworkOr5xxError && !originalRequest?._skipRetry) {
            const MAX_RETRIES = 3;
            const retryCount = originalRequest._retryCount || 0;
            if (retryCount < MAX_RETRIES) {
                originalRequest._retryCount = retryCount + 1;
                console.log(`⚠️ [Network] Retrying GET request (${originalRequest._retryCount}/${MAX_RETRIES}) to ${originalRequest.url} in 1.5s...`);
                await new Promise((resolve) => setTimeout(resolve, 1500));
                return client(originalRequest);
            }
        }

        // Auto-logout/Refresh logic
        if (error.response?.status === 401 && !originalRequest._retry) {
            
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
                    const newToken = typeof response.data === 'string'
                        ? response.data
                        : (response.data.accessToken || response.data.token);
                    const newRefreshToken = response.data.refreshToken || response.data.refresh_token || refreshToken;

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
                    
                    if (!originalRequest?._skipLogout) {
                        await removeToken().catch(() => {});
                        const store = getStore();
                        if (store) {
                            const { logoutUser } = require('../../store/authSlice');
                            store.dispatch(logoutUser());
                        }
                    }
                    return Promise.reject(refreshError);
                } finally {
                    isRefreshing = false;
                }
            } else {
                console.warn('⚠️ [Mobile] No refresh token available, skipping refresh attempt.');
            }
        }

        const isSilent = error.config?._silentErrors?.includes(error.response?.status);

        if (!isSilent) {
            if (error.response) {
                console.warn(`❌ [API Error] ${error.config?.method?.toUpperCase()} ${error.config?.url} (${error.response.status}):`, 
                    JSON.stringify(error.response.data || {}, null, 2));
            }
        }
        if (error.response) {            // Auto-logout as last resort if no refresh possible
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
            let apiMessage = 'Щось пішло не так. Ми вже працюємо над цим. Спробуйте, будь ласка, пізніше!';
            
            if (error.response.data) {
                const data = error.response.data;
                if (typeof data === 'string') {
                    apiMessage = data;
                } else if (data.message) {
                    apiMessage = data.message;
                } else if (data.errors && typeof data.errors === 'object') {
                    const errorList = [];
                    for (const key in data.errors) {
                        if (Array.isArray(data.errors[key])) {
                            errorList.push(...data.errors[key]);
                        } else if (typeof data.errors[key] === 'string') {
                            errorList.push(data.errors[key]);
                        }
                    }
                    if (errorList.length > 0) {
                        apiMessage = errorList.join('\n');
                    }
                } else if (data.detail) {
                    apiMessage = data.detail;
                } else if (data.title) {
                    apiMessage = data.title;
                }
            } else {
                const status = error.response.status;
                if (status === 400) {
                    apiMessage = 'Будь ласка, перевірте правильність заповнення полів.';
                } else if (status === 401) {
                    apiMessage = 'Будь ласка, авторизуйтеся в додатку знову.';
                } else if (status === 403) {
                    apiMessage = 'Ця дія наразі недоступна для вашого акаунту.';
                } else if (status === 404) {
                    apiMessage = 'Не вдалося знайти запитувані дані. Спробуйте оновити екран.';
                } else if (status >= 500) {
                    apiMessage = 'На сервері ведуться технічні роботи. Ми вже виправляємо це. Спробуйте за кілька хвилин!';
                }
            }

            // Translate common English API error texts to reassurance messages
            const commonTranslations = {
                'unauthorized': 'Будь ласка, увійдіть у свій акаунт знову.',
                'forbidden': 'Доступ обмежено.',
                'bad request': 'Перевірте правильність введених даних.',
                'not found': 'Дані не знайдено.',
                'server error': 'Тимчасові технічні неполадки на сервері. Скоро все запрацює!',
                'network error': 'Проблема зі з\'єднанням. Перевірте інтернет.',
                'timeout': 'Час очікування відповіді минув. Спробуйте ще раз.',
                'no token returned from refresh endpoint': 'Сесія закінчилася. Будь ласка, увійдіть в акаунт знову.',
                'failed to load catalog': 'Не вдалося завантажити каталог. Оновіть екран.',
                'restaurant is currently closed': 'Цей ресторан наразі зачинений і не приймає замовлень.',
                'restaurant_closed': 'Цей ресторан наразі зачинений і не приймає замовлень.',
                'out of delivery range': 'Ваша адреса знаходиться поза зоною доставки цього ресторану.',
                'out_of_delivery_range': 'Ваша адреса знаходиться поза зоною доставки цього ресторану.',
                'courier not found': 'Наразі немає вільних кур\'єрів. Спробуйте ще раз за кілька хвилин.',
                'courier_not_found': 'Наразі немає вільних кур\'єрів. Спробуйте ще раз за кілька хвилин.',
                'payment failed': 'Оплата не пройшла. Перевірте баланс картки або спробуйте інший спосіб оплати.',
                'payment_failed': 'Оплата не пройшла. Перевірте баланс картки або спробуйте інший спосіб оплати.',
                'order already processed': 'Це замовлення вже оброблено.',
                'order_already_processed': 'Це замовлення вже оброблено.',
                'alredy confirmed': 'Це замовлення вже підтверджено.',
                'already confirmed': 'Це замовлення вже підтверджено.',
                'cannot complate hold': 'Не вдалося завершити доставку через утримання оплати. Будь ласка, зв\'яжіться з адміністратором.',
                'cannot complete hold': 'Не вдалося завершити доставку через утримання оплати. Будь ласка, зв\'яжіться з адміністратором.',
            };

            const cleanMsg = apiMessage.toLowerCase().trim();
            for (const engKey in commonTranslations) {
                if (cleanMsg.includes(engKey)) {
                    apiMessage = commonTranslations[engKey];
                    break;
                }
            }
                
            const apiError = new Error(apiMessage);
            apiError.status = error.response.status;
            apiError.data = error.response.data;
            return Promise.reject(apiError);
        }
        if (error.request || !error.response) {
            console.error('[Axios Request Error]', error.message, error.config?.url);
            
            // Dispatch offline status & dynamic island error notice
            const store = getStore();
            if (store) {
                const { showDynamicIsland, setOffline } = require('../../store/uiSlice');
                store.dispatch(setOffline(true));
                
                const Device = require('expo-device');
                const isIphoneXR = Platform.OS === 'ios' && (
                    Device.modelName === 'iPhone XR' ||
                    Device.modelId === 'iPhone11,8' ||
                    String(Device.modelName || '').toLowerCase().includes('iphone xr')
                );
                
                if (!isIphoneXR) {
                    store.dispatch(showDynamicIsland({
                        type: 'error',
                        title: 'Помилка з\'єднання',
                        message: 'Перевірте інтернет та спробуйте ще раз.',
                        icon: 'wifi-outline',
                    }));
                }
            }

            if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
                return Promise.reject(
                    new Error('Очікування відповіді триває задовго. Будь ласка, перевірте швидкість інтернету та спробуйте знову.'),
                );
            }

            return Promise.reject(
                new Error('Немає зв\'язку з сервером. Перевірте підключення до мобільного інтернету або Wi-Fi та спробуйте знову.'),
            );
        }
        console.error('[Axios Error]', error.message);
        return Promise.reject(error);
    },
);

export default client;

// Base64 decoding helper for JWT token decoding
const b64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function base64Decode(input) {
  let str = input.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  let result = '';
  for (let i = 0; i < str.length; i += 4) {
    const w = b64Chars.indexOf(str[i]);
    const x = b64Chars.indexOf(str[i + 1]);
    const y = b64Chars.indexOf(str[i + 2]);
    const z = b64Chars.indexOf(str[i + 3]);
    if (w < 0 || x < 0) continue;
    const b1 = (w << 2) | (x >> 4);
    result += String.fromCharCode(b1);
    if (y !== -1 && str[i + 2] !== '=') {
      const b2 = ((x & 15) << 4) | (y >> 2);
      result += String.fromCharCode(b2);
      if (z !== -1 && str[i + 3] !== '=') {
        const b3 = ((y & 3) << 6) | z;
        result += String.fromCharCode(b3);
      }
    }
  }
  try {
    return decodeURIComponent(escape(result));
  } catch (e) {
    return result;
  }
}

export function isTokenExpired(token) {
  if (!token) return true;
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return true;
    const payloadStr = base64Decode(parts[1]);
    const payload = JSON.parse(payloadStr);
    if (!payload || !payload.exp) return true;
    const currentTime = Math.floor(Date.now() / 1000);
    // Buffer of 30 seconds to refresh slightly before expiration
    return payload.exp < currentTime + 30;
  } catch (e) {
    return true;
  }
}

export const getValidToken = async () => {
  let token = await getToken();
  if (!token) return null;

  if (isTokenExpired(token)) {
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({ resolve, reject });
      })
      .then(t => t)
      .catch(() => null);
    }

    isRefreshing = true;
    const refreshToken = await getRefreshToken();
    if (refreshToken) {
      try {
        console.log('🔄 [Auth Client] Refreshing token synchronously...');
        const response = await axios.post(`${BASE_URL}/auth/refresh`, 
          { refreshToken },
          { headers: { 'Content-Type': 'application/json' } }
        );
        const newToken = typeof response.data === 'string'
          ? response.data
          : (response.data.accessToken || response.data.token);
        const newRefreshToken = response.data.refreshToken || response.data.refresh_token || refreshToken;

        if (newToken) {
          await saveToken(newToken, newRefreshToken);
          client.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
          processQueue(null, newToken);
          return newToken;
        }
      } catch (err) {
        console.error('❌ [Auth Client] Synchronous token refresh failed:', err);
        processQueue(err, null);
        // Trigger logout
        await removeToken().catch(() => {});
        const store = getStore();
        if (store) {
          const { logoutUser } = require('../../store/authSlice');
          store.dispatch(logoutUser());
        }
      } finally {
        isRefreshing = false;
      }
    }
    return null;
  }
  return token;
};
