import client, { saveToken } from './client';

export const authLogin = async (data) => {
    const response = await client.post('/auth/login', data);
    const token = typeof response === 'string' ? response : response?.accessToken;
    const refreshToken = response?.refreshToken;
    if (token) {
        saveToken(token, refreshToken);
    }
    return response;
};

export const getMe = () => client.get('/auth/me');

