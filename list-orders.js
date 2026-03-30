const BASE_URL = 'http://37.27.220.44'; // Backend real URL
const PHONE = '+380991300003';
const PASS = 'string123';

async function run() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
        });
        console.log("Login Status:", loginRes.status);
        const loginText = await loginRes.text();
        let loginData;
        try { loginData = JSON.parse(loginText); } catch(e) { console.error("Login parse failed:", loginText); return; }
        
        const token = loginData.accessToken || loginData;
        if (!token) { console.error("No token found"); return; }
        
        const authHeader = { 'Authorization': `Bearer ${token}` };

        console.log("Fetching all deliveries...");
        const res = await fetch(`${BASE_URL}/restaurant/deliveries?pageSize=100`, { headers: authHeader });
        const resText = await res.text();
        console.log("Fetch Status:", res.status);
        
        let data;
        try { data = JSON.parse(resText); } catch(e) { console.error("Fetch parse failed:", resText); return; }
        
        const items = Array.isArray(data) ? data : (data.items || []);
        console.log(`Found ${items.length} orders.`);

        if (items.length > 0) {
            console.table(items.slice(0, 10).map(o => ({
                id: o.deliveryId || o.id,
                status: o.deliveryStatus ?? o.statusDelivery,
                customer: o.customerName || 'N/A',
                created: o.createdAt
            })));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
