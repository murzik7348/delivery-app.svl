const fetch = require('node-fetch');
const BASE_URL = 'http://37.27.220.44';
const PHONE = '+380684047200';
const PASS = 'string123';

async function checkCourierEndpoints() {
    console.log(`\n🔍 Checking Courier Endpoints...`);

    let token = '';
    try {
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
        });
        const loginData = await loginRes.json();
        token = loginData.accessToken || loginData;
        console.log("✅ Authenticated");
    } catch (e) {
        console.error("❌ Login failed:", e.message);
        return;
    }

    const authHeader = { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };

    const endpoints = [
        { name: 'GET DELIVERIES', path: '/courier/deliveries', method: 'GET' },
        { name: 'GET MY DELIVERIES', path: '/courier/deliveries/my', method: 'GET' },
        { name: 'STATUS (PUT)', path: '/courier/status', method: 'PUT', body: { isOnline: true } },
        { name: 'LOCATION (PUT)', path: '/courier/location', method: 'PUT', body: { latitude: 50.45, longitude: 30.52 } },
        // Try alternatives if 404
        { name: 'STATUS ALT (POST)', path: '/courier/status', method: 'POST', body: { isOnline: true } },
        { name: 'USER STATUS', path: '/user/status', method: 'PUT', body: { isOnline: true } },
    ];

    for (const ep of endpoints) {
        process.stdout.write(`Testing ${ep.name} (${ep.method} ${ep.path})... `);
        try {
            const res = await fetch(`${BASE_URL}${ep.path}`, {
                method: ep.method,
                headers: authHeader,
                body: ep.body ? JSON.stringify(ep.body) : undefined
            });
            console.log(`Status ${res.status}`);
            if (res.status === 200 || res.status === 204) {
                console.log(`   ✨ FOUND!`);
            } else if (res.status === 404) {
                console.log(`   ⚠️  404`);
            } else {
                const text = await res.text();
                console.log(`   📝 Response: ${text.substring(0, 100)}`);
            }
        } catch (e) {
            console.log(`Error: ${e.message}`);
        }
    }
}
checkCourierEndpoints();
