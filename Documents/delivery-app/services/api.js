import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// 1. Вкажи тут адресу твого бекенду (локальна або реальна)
// Для емулятора Android: 'http://10.0.2.2:5000/api'
// Для емулятора iOS: 'http://localhost:5000/api'
export const API_URL = 'https://your-backend-url.com/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Interceptor: Автоматично додаємо Token до кожного запиту
api.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// 3. Обробка помилок (наприклад, якщо токен протух - 401)
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Тут можна робити логаут або рефреш токена
      await SecureStore.deleteItemAsync('token');
    }
    return Promise.reject(error);
  }
);

export default api;