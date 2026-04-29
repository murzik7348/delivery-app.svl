const BASE_URL = 'http://37.27.220.44';
const PHONE = '+380991300002';
const PASS = 'string123';

async function testProductUpdate() {
    try {
        console.log("Logging in...");
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: PHONE, password: PASS })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData;
        
        const authHeader = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };

        // Get first product
        const prodRes = await fetch(`${BASE_URL}/product?pageSize=1`, { headers: authHeader });
        const prodData = await prodRes.json();
        const product = Array.isArray(prodData) ? prodData[0] : prodData.items[0];

        if (!product) { console.log("No product found to test."); return; }
        
        console.log(`Testing UPDATE for product ${product.id} with custom 'ingredients' field...`);
        const updateRes = await fetch(`${BASE_URL}/product/${product.id}`, {
            method: 'PUT',
            headers: authHeader,
            body: JSON.stringify({
                ...product,
                ingredients: ["Tomato", "Cheese", "Garlic"] // Test if it sticks
            })
        });

        console.log("Update Status:", updateRes.status);
        
        // Fetch back to see if it remains
        const checkRes = await fetch(`${BASE_URL}/product/${product.id}`, { headers: authHeader });
        const checkData = await checkRes.json();
        
        console.log("\n--- UPDATED DATA ---");
        console.log(JSON.stringify(checkData, null, 2));

        if (checkData.ingredients) {
            console.log("✅ SUCCESS: Backend supports custom 'ingredients' field!");
        } else {
            console.log("❌ FAILURE: Backend ignored 'ingredients' field.");
            console.log("Available fields:", Object.keys(checkData).join(', '));
        }
    } catch (e) {
        console.error("Error:", e.message);
    }
}
testProductUpdate();
