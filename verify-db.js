const BASE_URL = 'http://37.27.220.44';

async function api(path, options = {}) {
    const url = `${BASE_URL}${path}`;
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };
    
    try {
        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        let data;
        try {
            data = JSON.parse(text);
        } catch (e) {
            data = text; // Fallback to plain text
        }
        return { status: response.status, data, ok: response.ok };
    } catch (e) {
        return { status: 0, data: e.message, ok: false };
    }
}

async function login(phoneNumber, password) {
    console.log(`\n🔑 Attempting login for ${phoneNumber}...`);
    const res = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ phoneNumber, password })
    });
    if (res.ok) {
        // Handle both object and string responses
        const token = typeof res.data === 'string' ? res.data : (res.data.accessToken || res.data.token);
        if (token) {
            console.log(`✅ Login success! Token: ${token.substring(0, 15)}...`);
            return token;
        }
    }
    console.log(`❌ Login failed for ${phoneNumber}: Status ${res.status}, Error: ${JSON.stringify(res.data)}`);
    return null;
}

async function runTests() {
    const credentials = {
        app: { phone: '+380684047200', pass: 'string123' },
        admin: { phone: '+380991300002', pass: 'string123' },
        restaurant: { phone: '+380991300003', pass: 'string123' }
    };

    console.log('\n🚀 Starting FULL API Verification for Database Update 🚀');
    console.log('Base URL:', BASE_URL);

    // 1. PUBLIC ENDPOINTS (Verification again, now we know they're protected)
    console.log('\n--- 📁 [Public] Catalog (Checking 401) ---');
    const publicChecks = ['/restaurant', '/product', '/category'];
    for (const path of publicChecks) {
        const res = await api(path);
        console.log(`${res.status === 401 ? '🔒' : '✅'} ${path}: Status ${res.status}`);
    }

    // 2. USER ROLE (Mobile App)
    console.log('\n--- 📱 [User/App Role] Verification ---');
    const userToken = await login(credentials.app.phone, credentials.app.pass);
    if (userToken) {
        const authHeader = { 'Authorization': `Bearer ${userToken}` };
        
        // Check Profile
        const meRes = await api('/auth/me', { headers: authHeader });
        console.log(`✅ /auth/me: Status ${meRes.status}, Name: ${meRes.data.name || 'N/A'}, Role: ${meRes.data.role || meRes.data.userRole}`);
        
        // Check Addresses
        const addrRes = await api('/address', { headers: authHeader });
        console.log(`✅ /address: Status ${addrRes.status}, Found: ${Array.isArray(addrRes.data) ? addrRes.data.length : 0} addresses`);
        
        // Check Products (Now with token)
        const prodRes = await api('/product?pageSize=5', { headers: authHeader });
        console.log(`✅ /product: Status ${prodRes.status}, Found: ${prodRes.data.items?.length || prodRes.data.length || 0} products`);
    }

    // 3. ADMIN ROLE
    console.log('\n--- 🛠️ [Admin Role] Verification ---');
    const adminToken = await login(credentials.admin.phone, credentials.admin.pass);
    if (adminToken) {
        const authHeader = { 'Authorization': `Bearer ${adminToken}` };
        
        // Check Admin Users
        const usersRes = await api('/admin/users?pageSize=5', { headers: authHeader });
        console.log(`✅ /admin/users: Status ${usersRes.status}, Sample size: ${usersRes.data.length || 0}`);
        
        // Check Admin Deliveries
        const delRes = await api('/admin/delivery?pageSize=5', { headers: authHeader });
        console.log(`✅ /admin/delivery: Status ${delRes.status}, Recent deliveries: ${delRes.data.length || 0}`);
    }

    // 4. RESTAURANT ROLE
    console.log('\n--- 🍳 [Restaurant Role] Verification ---');
    const restToken = await login(credentials.restaurant.phone, credentials.restaurant.pass);
    if (restToken) {
        const authHeader = { 'Authorization': `Bearer ${restToken}` };
        
        // Check Restaurant Deliveries
        const restDelRes = await api('/restaurant/deliveries?pageSize=5', { headers: authHeader });
        console.log(`✅ /restaurant/deliveries: Status ${restDelRes.status}, Count: ${restDelRes.data.length || 0}`);
        
        // Check Restaurant Info
        const infoRes = await api('/restaurant', { headers: authHeader });
        console.log(`✅ /restaurant (Info): Status ${infoRes.status}, Details: ${JSON.stringify(infoRes.data).substring(0, 50)}...`);
    }

    console.log('\n🏁 Full Verification Completed 🏁\n');
}

runTests().catch(err => console.error('CRITICAL ERROR:', err));
