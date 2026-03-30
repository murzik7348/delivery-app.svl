const BASE_URL = 'http://37.27.220.44';
const PHONES = [
  '+380684047200',
  '+380991300000',
  '+380991300001',
  '+380991300002',
  '+380991300003'
];
const PASS = 'string123';

async function diagnose() {
    const orderId = process.argv[2] || '249';
    console.log(`\n🔍 Searching for Order #${orderId} across known manager accounts...`);

    for (const phone of PHONES) {
        process.stdout.write(`Trying ${phone}... `);
        try {
            const loginRes = await fetch(`${BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: phone, password: PASS })
            });
            const loginData = await loginRes.json();
            const token = loginData.accessToken || loginData;
            if (!token) { console.log("Login failed."); continue; }
            
            const authHeader = { 'Authorization': `Bearer ${token}` };
            const listRes = await fetch(`${BASE_URL}/restaurant/deliveries?pageSize=100`, { headers: authHeader });
            const data = await listRes.json();
            const items = Array.isArray(data) ? data : (data.items || []);
            const order = items.find(o => (o.deliveryId || o.id) == orderId);
            
            if (order) {
                console.log(`✅ FOUND! Status: ${order.deliveryStatus} (${order.statusDelivery})`);
                console.log("Full Data:", JSON.stringify(order));
                
                // Test acceptance
                console.log("\nTesting /confirm (Acceptance)...");
                const confRes = await fetch(`${BASE_URL}/restaurant/deliveries/${orderId}/confirm`, {
                    method: 'PUT',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const confData = await confRes.json().catch(() => ({}));
                console.log(`Status ${confRes.status}:`, JSON.stringify(confData));
                
                return;
            } else {
                console.log("Not found.");
            }
        } catch (e) {
            console.log("Error:", e.message);
        }
    }
    console.log("\n❌ Order not found in any known account.");
}
diagnose();
