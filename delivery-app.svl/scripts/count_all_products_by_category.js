const BASE_URL = 'https://api.andi.delivery';

async function main() {
    try {
        const phone = '+380991300002';
        const password = 'string123';
        
        console.log('🔐 Авторизація...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, password })
        });
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token;
        
        console.log('📂 Отримання категорій...');
        const catRes = await fetch(`${BASE_URL}/category`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const categories = await catRes.json();
        
        const categoryMap = {};
        categories.forEach(c => {
            categoryMap[c.id || c.categoryId] = c.name;
        });
        
        console.log('🍲 Отримання всіх товарів ресторану 1...');
        let page = 1;
        let allProducts = [];
        while (true) {
            const prodRes = await fetch(`${BASE_URL}/product?restaurantId=1&pageSize=50&page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await prodRes.json();
            const items = data.items || data || [];
            if (items.length === 0) break;
            allProducts = allProducts.concat(items);
            if (items.length < 50) break;
            page++;
        }
        
        console.log(`Всього знайдено товарів у базі: ${allProducts.length}`);
        
        const categoryCounts = {};
        allProducts.forEach(p => {
            const catName = categoryMap[p.categoryId] || `Невідома категорія (${p.categoryId})`;
            categoryCounts[catName] = (categoryCounts[catName] || 0) + 1;
        });
        
        console.log('\nКількість товарів за категоріями:');
        console.log(JSON.stringify(categoryCounts, null, 2));
    } catch (err) {
        console.error(err);
    }
}

main();
