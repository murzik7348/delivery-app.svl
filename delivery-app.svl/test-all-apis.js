const axios = require('axios');

const BASE_URL = 'http://37.27.220.44';

const client = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: { 'Content-Type': 'application/json' },
});

// We will add logging here to mimic what happens in the app
client.interceptors.request.use(config => {
    console.log(`\n>[Node] RUNNING: ${config.method.toUpperCase()} ${config.baseURL}${config.url}`);
    if (config.data) console.log(`Payload:`, config.data);
    return config;
});
client.interceptors.response.use(
    res => {
        console.log(`[Node] SUCCESS: ${res.status}`);
        return res;
    },
    err => {
        console.log(`[Node] ERROR:`, err.response ? err.response.status : err.message);
        // We resolve errors so the script continues
        return Promise.resolve(err.response || { data: { error: err.message } });
    }
);

async function runTests() {
    let token = '';

    console.log('--- 1. Auth ---');
    // Try to login with a dummy user or just start auth
    const authStartRes = await client.post('/auth/start', { phone: '+380991234567' });

    // Try a dummy login if possible
    const loginRes = await client.post('/auth/login', { phone: '+380991234567', password: 'password123' });
    if (loginRes.data && loginRes.data.accessToken) {
        token = loginRes.data.accessToken;
        client.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        console.log('Set Authorization header for subsequent requests.');
    }

    // Try get profile
    await client.get('/auth/me');

    console.log('\n--- 2. Addresses ---');
    await client.get('/address');

    console.log('\n--- 3. Categories & Products ---');
    await client.get('/category');
    await client.get('/product?page=1&pageSize=10');

    console.log('\n--- 4. Deliveries (if logged in) ---');
    await client.get('/delivery/my');

    console.log('\n--- All requested test blocks finished ---');
}

runTests().catch(console.error);
