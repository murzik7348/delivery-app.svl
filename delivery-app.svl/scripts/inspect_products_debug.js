const BASE_URL = 'https://api.andi.delivery';

async function main() {
    try {
        const phone = '+380991300002';
        const password = 'string123';
        
        console.log('Logging in...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, password })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token;
        
        console.log('Fetching page 1 of products...');
        const prodRes = await fetch(`${BASE_URL}/product?restaurantId=1&pageSize=10&page=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await prodRes.json();
        console.log('Raw Response:', JSON.stringify(data, null, 2));
    } catch (err) {
        console.error(err);
    }
}

main();
