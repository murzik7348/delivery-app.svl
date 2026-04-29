const BASE_URL = 'http://37.27.220.44';
const PHONE = '+380991300002';
const PASS = 'string123';

async function run() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
        });
        const loginText = await loginRes.text();
        let loginData;
        try { loginData = JSON.parse(loginText); } catch(e) { console.error("Login parse failed:", loginText); return; }
        
        const token = loginData.accessToken || loginData;
        if (!token) { console.error("No token found"); return; }
        
        const authHeader = { 'Authorization': `Bearer ${token}` };

        console.log("Fetching deliveries...");
        const res = await fetch(`${BASE_URL}/restaurant/deliveries?pageSize=10`, { headers: authHeader });
        const resText = await res.text();
        console.log("Fetch Status:", res.status);
        
        let data;
        try { data = JSON.parse(resText); } catch(e) { console.warn("Fetch parse failed:", resText); return; }
        
        const items = Array.isArray(data) ? data : (data.items || []);
        
        if (items.length > 0) {
            console.log("\n--- ORDER #1 RAW DATA ---");
            console.log(JSON.stringify(items[0], null, 2));
            
            console.log("\n--- AVAILABLE FIELDS ---");
            console.log(Object.keys(items[0]).join(', '));
        } else {
            console.log("No orders found for this restaurant.");
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
