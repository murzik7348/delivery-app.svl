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
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData;
        if (!token) { console.error("No token found"); return; }
        
        const authHeader = { 'Authorization': `Bearer ${token}` };

        console.log("Fetching /deliveries/my ...");
        const res = await fetch(`${BASE_URL}/deliveries/my`, { headers: authHeader });
        const resText = await res.text();
        console.log("Fetch Status:", res.status);
        console.log("Response:", resText);
        
        console.log("Fetching /admin/delivery ...");
        const resAdmin = await fetch(`${BASE_URL}/admin/delivery?page=1&pageSize=50`, { headers: authHeader });
        const resAdminText = await resAdmin.text();
        console.log("Admin Fetch Status:", resAdmin.status);
        console.log("Admin Response:", resAdminText.substring(0, 500));
    } catch (e) {
        console.error("Error:", e.message);
    }
}
run();
