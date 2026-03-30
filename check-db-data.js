const http = require('http');

function get(url) {
    return new Promise((resolve, reject) => {
        http.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(data) });
                } catch (e) {
                    resolve({ status: res.statusCode, data: data });
                }
            });
        }).on('error', (err) => reject(err));
    });
}

async function checkDB() {
    const BASE_URL = 'http://37.27.220.44';
    try {
        const prod = await get(`${BASE_URL}/product?pageSize=50`);
        console.log('\n--- PRODUCTS ---');
        console.log('Status:', prod.status);
        if (prod.status === 200) {
            const items = Array.isArray(prod.data) ? prod.data : (prod.data.items || []);
            console.log('Count:', items.length);
            items.forEach(p => {
                console.log(`Product: ${p.name}, RestaurantID: ${p.restaurantId || p.RestaurantId}`);
            });
        } else {
            console.log('Cannot get products without token, but endpoints are active.');
        }
    } catch (err) {
        console.error('❌ Error:', err.message);
    }
}

checkDB();
