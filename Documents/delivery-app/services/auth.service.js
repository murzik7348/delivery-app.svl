import * as SecureStore from 'expo-secure-store';

export const authService = {
  // Функція входу (імітуємо, що сервер відповів)
  login: async (phone_number, password) => {
    console.log(`📡 Пробуємо увійти з номером: ${phone_number}`);
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Перевіряємо: Номер 0991234567, пароль 123456
        if (phone_number === '0991234567' && password === '123456') {
          resolve({
            data: {
              token: 'fake-jwt-token-secret',
              user: { id: 1, name: 'Дмитро', role: 'client' }
            }
          });
        } else {
          // Якщо дані не ті
          reject({ response: { data: { message: 'Невірний номер або пароль' } } });
        }
      }, 1000);
    });
  },

  logout: async () => {
    await SecureStore.deleteItemAsync('token');
  }
};