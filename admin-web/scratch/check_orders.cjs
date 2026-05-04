const axios = require('axios');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjUyMSIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IkNvdXJpZXIiLCJleHAiOjE3Nzc4OTExMTEsImlzcyI6IkRlbGl2ZXJ5QXBpIiwiYXVkIjoiRGVsaXZlcnlBcGkifQ.hyzVzVJV_AvS3AUet9xUf_UtgNfBG9hDQg0ZBOC9-wY';
const courierId = 521;

async function check() {
    try {
        console.log('Fetching all deliveries from admin endpoint...');
        // We use a dummy admin token or try the courier token if the API allows it for /admin/delivery (unlikely but let's see)
        // Actually, let's just fetch /courier/deliveries/my with the provided token.
        const res = await axios.get('http://37.27.220.44/courier/deliveries/my?page=1&pageSize=50', {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const orders = res.data.items || res.data;
        console.log(`Found ${orders.length} orders for courier ${courierId} via /courier/deliveries/my`);
        
        orders.forEach(o => {
            console.log(`Order ID: ${o.deliveryId || o.id}, Status: ${o.deliveryStatus || o.status}, StatusString: ${o.statusDelivery}`);
        });

        // Also fetch with deliveryStatus=3 to see what the user meant
        const res3 = await axios.get('http://37.27.220.44/courier/deliveries/my?page=1&pageSize=50&deliveryStatus=3', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const orders3 = res3.data.items || res3.data;
        console.log(`Found ${orders3.length} orders with deliveryStatus=3`);

    } catch (err) {
        console.error('Error:', err.message);
        if (err.response) console.error('Response:', err.response.data);
    }
}

check();
