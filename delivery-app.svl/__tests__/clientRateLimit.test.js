import client from '../src/api/client';
import { Alert } from 'react-native';

jest.mock('expo-secure-store', () => ({
  setItemAsync: jest.fn(),
  getItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
}));

jest.mock('react-native', () => ({
  Alert: { alert: jest.fn() },
  Platform: { OS: 'ios' }
}));

jest.mock('../src/api/storeRef', () => ({
  getStore: jest.fn(() => ({
    dispatch: jest.fn()
  }))
}));

describe('Axios Client Rate Limiting', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Date, 'now');
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should block requests locally and show Alert after 3 failures in 10 seconds', async () => {
    let nowTime = 100000;
    Date.now.mockImplementation(() => nowTime);

    // Mock axios adapter to return 500 errors (use POST to bypass auto-retries)
    client.defaults.adapter = jest.fn().mockImplementation((config) => {
      const err = new Error('Request failed with status code 500');
      err.config = config;
      err.response = { status: 500, data: { message: 'Internal Server Error' } };
      return Promise.reject(err);
    });

    // Make 1st request -> fails 500
    await expect(client.post('/test')).rejects.toThrow();

    // Make 2nd request -> fails 500
    await expect(client.post('/test')).rejects.toThrow();

    // Make 3rd request -> fails 500
    await expect(client.post('/test')).rejects.toThrow();

    // The 3rd failure should have triggered the Alert
    expect(Alert.alert).toHaveBeenCalledWith(
      'Зв\'язок із сервером',
      'Наразі сервер не відповідає, треба трохи зачекати.'
    );

    Alert.alert.mockClear();

    // Make 4th request -> should be BLOCKED locally without triggering the adapter
    client.defaults.adapter.mockClear();
    await expect(client.post('/test')).rejects.toThrow('Наразі сервер не відповідає, треба трохи зачекати.');
    expect(client.defaults.adapter).not.toHaveBeenCalled();

    // Advance time by 11 seconds (more than 10 seconds window)
    nowTime += 11000;
    
    // 5th request -> should go through (adapter is called) because old failures expired
    client.defaults.adapter.mockImplementation((config) => {
      return Promise.resolve({ data: 'success', status: 200, config });
    });
    const res = await client.post('/test');
    expect(client.defaults.adapter).toHaveBeenCalled();
    expect(res).toBe('success'); // client unwraps response.data
  });

  it('should reset failure count when a request succeeds', async () => {
    let nowTime = 100000;
    Date.now.mockImplementation(() => nowTime);

    // Mock axios adapter to fail
    client.defaults.adapter = jest.fn().mockImplementation((config) => {
      const err = new Error('Request failed with status code 500');
      err.config = config;
      err.response = { status: 500, data: { message: 'Internal Server Error' } };
      return Promise.reject(err);
    });

    // 2 failures
    await expect(client.post('/test')).rejects.toThrow();
    await expect(client.post('/test')).rejects.toThrow();

    // Now a success
    client.defaults.adapter.mockImplementation((config) => {
      return Promise.resolve({ data: 'success', status: 200, config });
    });
    const res = await client.post('/test');
    expect(res).toBe('success');

    // Mock failure again
    client.defaults.adapter.mockImplementation((config) => {
      const err = new Error('Request failed with status code 500');
      err.config = config;
      err.response = { status: 500, data: { message: 'Internal Server Error' } };
      return Promise.reject(err);
    });

    // 1st failure after success
    await expect(client.post('/test')).rejects.toThrow();

    // Request should NOT be blocked (since failure count was reset to 0, and we only have 1 new failure)
    client.defaults.adapter.mockClear();
    client.defaults.adapter.mockImplementation((config) => {
      return Promise.resolve({ data: 'success', status: 200, config });
    });
    const res2 = await client.post('/test');
    expect(client.defaults.adapter).toHaveBeenCalled();
    expect(res2).toBe('success');
  });
});
