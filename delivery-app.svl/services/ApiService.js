import axios from 'axios';
import { store } from '../store';
import { logoutUser } from '../store/authSlice';

// Base URL for the future production backend. 
// Uses localhost for iOS simulator, interchangeable for production.
const BASE_URL = 'http://localhost:3000/api';

const ApiService = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request Interceptor: Pass Bearer Token if Authenticated
ApiService.interceptors.request.use(
    (config) => {
        // Redux store is accessed directly to get the current token
        const state = store.getState();
        const token = state.auth?.user?.token;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Response Interceptor: Global Error Handling & Token Expiration
ApiService.interceptors.response.use(
    (response) => {
        return response.data; // Unwrap the data cleanly for services
    },
    (error) => {
        if (error.response) {
            // Handle 401 Unauthorized (Token expired/Invalid)
            if (error.response.status === 401) {
                console.warn('[ApiService] 401 Unauthorized. Logging user out.');
                store.dispatch(logoutUser());
            }

            // Format standard API error structure
            const apiError = new Error(error.response.data?.message || 'Помилка сервера. Спробуйте пізніше.');
            apiError.status = error.response.status;
            apiError.data = error.response.data;
            return Promise.reject(apiError);
        } else if (error.request) {
            // Network failure (No response received)
            return Promise.reject(new Error('Немає зв\'язку з сервером. Перевірте інтернет-з\'єднання.'));
        }

        return Promise.reject(error);
    }
);

export default ApiService;
