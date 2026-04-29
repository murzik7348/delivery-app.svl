const BASE_URL = 'http://37.27.220.44';
const PHONE = '+380991300002';
const PASS = 'string123';

async function testBody() {
    const orderId = '249';
    console.log(`\n🔍 Re-testing /confirm for Order #${orderId}...`);

    const loginRes = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
    });
    const loginData = await loginRes.json();
    const token = loginData.accessToken || loginData;
    const authHeader = { 
        'Authorization': `Bearer ${token}`, 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    console.log("Token acquired:", token.substring(0, 10) + "...");

    // Test B: Empty object {}
    console.log("\n--- Test: Empty object {} ---");
    const resB = await fetch(`${BASE_URL}/restaurant/deliveries/${orderId}/confirm`, {
        method: 'PUT',
        headers: authHeader,
        body: '{}'
    });
    const textB = await resB.text();
    console.log(`Status ${resB.status}:`, textB);

    if (resB.status === 200 || resB.status === 204) {
        console.log("✅ SUCCESS! Status updated on backend.");
    } else {
        console.log("❌ FAILED. Status 400/403/off.");
    }
}
testBody();
