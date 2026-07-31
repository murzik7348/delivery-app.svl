const { getProducts, getCategories } = require('./src/api');
const { resolveImageUrl } = require('./src/api/client');

async function test() {
    try {
        const productsRes = await getProducts({ restaurantId: 1, page: 1, pageSize: 50 });
        const items = productsRes.items || productsRes;
        console.log(`Rutenia products: ${items.length}`);
        
        const counts = {};
        items.forEach(i => {
            const img = resolveImageUrl(i.urlBase || i.imageUrl);
            if (img) {
                counts[img] = (counts[img] || 0) + 1;
            }
        });
        
        console.log('Duplicate images:');
        Object.entries(counts).filter(([img, count]) => count > 1).forEach(([img, count]) => {
            console.log(`${count}: ${img}`);
        });

        const catRes = await getCategories();
        console.log(`Categories: ${catRes.length}`);
        const catCounts = {};
        catRes.forEach(c => {
            const img = resolveImageUrl(c.urlBase || c.imageUrl);
            if (img) {
                catCounts[img] = (catCounts[img] || 0) + 1;
            }
        });
        
        console.log('Duplicate category images:');
        Object.entries(catCounts).filter(([img, count]) => count > 1).forEach(([img, count]) => {
            console.log(`${count}: ${img}`);
        });

    } catch (e) {
        console.error('Error:', e.message);
    }
}
test();
