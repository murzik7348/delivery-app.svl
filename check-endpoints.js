const BASE_URL = 'http://37.27.220.44';
const PHONE = '+380991300002';
const PASS = 'string123';

async function checkEndpoints() {
    const orderId = '249';
    console.log(`\n🔍 Checking Backend Endpoints for Order #${orderId}...`);

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken || loginData;
    const authHeader = { 'Authorization': `Bearer ${token}` };

    const endpoints = [
        { name: 'CONFIRM', path: `/restaurant/deliveries/${orderId}/confirm`, method: 'PUT' },
        { name: 'PREPARE', path: `/restaurant/deliveries/${orderId}/prepare`, method: 'PUT' },
        { name: 'READY', path: `/restaurant/deliveries/${orderId}/ready`, method: 'PUT' },
        { name: 'CANCEL', path: `/restaurant/deliveries/${orderId}/cancel`, method: 'PUT' }
    ];

    for (const ep of endpoints) {
        process.stdout.write(`Testing ${ep.name} (${ep.path})... `);
        try {
            const res = await fetch(`${BASE_URL}${ep.path}`, {
                method: ep.method,
                headers: authHeader
            });
            console.log(`Status ${res.status}`);
            if (res.status === 404) {
                console.log(`   ⚠️  NOT DEPLOYED (404)`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}
checkEndpoints();
