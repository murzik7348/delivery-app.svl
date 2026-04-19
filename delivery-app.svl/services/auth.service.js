import * as SecureStore from 'expo-secure-store';

export const authService = {
  login: async (phone_number, password) => {
    console.log(`📡 Пробуємо увійти з номером: ${phone_number}`);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        if (phone_number === '0991234567' && password === '123456') {
          resolve({
            data: {
              token: 'fake-jwt-token-secret',
              user: { id: 1, name: 'Дмитро', role: 'client' }
            }
          });
        } else {
          reject({ response: { data: { message: 'Невірний номер або пароль' } } });
        }
      }, 1000);
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
  }
};