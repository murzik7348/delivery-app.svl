const axios = require('axios');

const BASE_URL = 'http://37.27.220.44';

async function test() {
    try {
        console.log('Fetching restaurants...');
        const resRestaurants = await axios.get(`${BASE_URL}/restaurant`);
        const restaurants = resRestaurants.data;
        console.log(`Found ${restaurants.length} restaurants:`, restaurants.map(r => ({ id: r.restaurantId, name: r.name })));

        console.log('\nFetching products (limit 100)...');
        const resProducts = await axios.get(`${BASE_URL}/product?pageSize=100`);
        const products = resProducts.data;
        console.log(`Found ${products.length} products.`);

        const distribution = {};
        products.forEach(p => {
            distribution[p.restaurantId] = (distribution[p.restaurantId] || 0) + 1;
        });

        console.log('\nProduct distribution per restaurantId:');
        console.log(distribution);

        restaurants.forEach(r => {
            const count = products.filter(p => p.restaurantId == r.restaurantId).length;
            console.log(`Restaurant "${r.name}" (ID: ${r.restaurantId}) has ${count} products in the top 100.`);
        });

    } catch (err) {
        console.error('Error:', err.message);
    }
}

test();
