const fs = require('fs');
const path = require('path');
const https = require('https');

const BASE_URL = 'https://api.andi.delivery';
const PARSED_MENU_PATH = '/Users/dimamurza/Desktop/delivery-app/delivery-app.svl/scripts/menu_parsed.json';
const TEMP_DIR = '/Users/dimamurza/Desktop/delivery-app/delivery-app.svl/scripts/temp';
const FALLBACK_IMAGE_PATH = '/Users/dimamurza/Desktop/delivery-app/phot/image.png';

const ROOT_CATALOG_PATH = '/Users/dimamurza/Desktop/delivery-app/rutenia_food_catalog.json';
const SVL_CATALOG_PATH = '/Users/dimamurza/Desktop/delivery-app/delivery-app.svl/rutenia_food_catalog.json';

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (response) => {
            if (response.statusCode !== 200) {
                reject(new Error(`Status code: ${response.statusCode}`));
                return;
            }
            response.pipe(file);
            file.on('finish', () => {
                file.close();
                resolve();
            });
        }).on('error', (err) => {
            fs.unlink(destPath, () => {});
            reject(err);
        });
    });
}

function parseIdFromText(text, key) {
    try {
        const obj = JSON.parse(text);
        return obj[key] || obj.id || obj.categoryId || obj.productId || parseInt(text, 10);
    } catch {
        const num = parseInt(text, 10);
        return isNaN(num) ? text : num;
    }
}

async function main() {
    try {
        if (!fs.existsSync(PARSED_MENU_PATH)) {
            throw new Error(`Не знайдено файл меню: ${PARSED_MENU_PATH}`);
        }
        if (!fs.existsSync(FALLBACK_IMAGE_PATH)) {
            throw new Error(`Не знайдено зображення-плейсхолдер: ${FALLBACK_IMAGE_PATH}`);
        }

        const parsedMenu = JSON.parse(fs.readFileSync(PARSED_MENU_PATH, 'utf-8'));
        
        const phone = '+380991300002';
        const password = 'string123';
        const targetRestaurantId = 1; // Рутенія

        console.log('🔐 Входимо в систему...');
        const loginRes = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phoneNumber: phone, password })
        });
        
        if (!loginRes.ok) {
            const errorText = await loginRes.text();
            throw new Error(`Не вдалося авторизуватися: ${loginRes.status} ${errorText}`);
        }
        
        const loginData = await loginRes.json();
        const token = loginData.accessToken || loginData.token;
        if (!token) {
            throw new Error('Токен авторизації не знайдено!');
        }
        console.log('✅ Авторизовано успішно!');

        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        // Отримуємо наявні категорії на бекенді
        console.log('\n📂 Отримуємо категорії з бекенду...');
        const catRes = await fetch(`${BASE_URL}/category`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catRes.ok) {
            throw new Error(`Не вдалося отримати категорії: ${catRes.status}`);
        }
        const existingCategories = await catRes.json();
        console.log(`Знайдено ${existingCategories.length} існуючих категорій.`);

        const categoryMapping = {};
        parsedMenu.categories.forEach(c => {
            const matched = existingCategories.find(ec => ec.name.trim().toLowerCase() === c.name.trim().toLowerCase());
            if (matched) {
                categoryMapping[c.id] = matched.categoryId || matched.id;
            }
        });

        // Створюємо відсутні категорії
        console.log('\n📂 Створюємо нові категорії...');
        for (const c of parsedMenu.categories) {
            if (categoryMapping[c.id]) continue;
            
            console.log(`   - Створення категорії "${c.name}"...`);
            
            const fileBuffer = fs.readFileSync(FALLBACK_IMAGE_PATH);
            const fileBlob = new Blob([fileBuffer], { type: 'image/png' });
            
            const formData = new FormData();
            formData.append('Name', c.name.trim());
            formData.append('Image', fileBlob, 'category.png');
            
            const createCatRes = await fetch(`${BASE_URL}/category`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` },
                body: formData
            });
            
            if (!createCatRes.ok) {
                const errText = await createCatRes.text();
                console.error(`❌ Помилка створення категорії "${c.name}":`, createCatRes.status, errText);
                continue;
            }
            
            const catIdText = await createCatRes.text();
            const newCatId = parseIdFromText(catIdText, 'categoryId');
            categoryMapping[c.id] = newCatId;
            console.log(`     ✅ Успішно створено (Новий ID: ${newCatId})`);
        }

        // Отримуємо наявні товари на бекенді для ресторану
        console.log('\n🍲 Перевіряємо наявні товари на бекенді...');
        const prodListRes = await fetch(`${BASE_URL}/product?restaurantId=${targetRestaurantId}&pageSize=500`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!prodListRes.ok) {
            throw new Error(`Не вдалося отримати товари з бекенду: ${prodListRes.status}`);
        }
        const prodListData = await prodListRes.json();
        const existingProducts = prodListData.items || prodListData || [];
        console.log(`Знайдено ${existingProducts.length} існуючих товарів на бекенді.`);

        // Створюємо товари
        console.log(`\n🍲 Починаємо імпорт товарів (${parsedMenu.items.length} шт.)...`);
        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < parsedMenu.items.length; i++) {
            const item = parsedMenu.items[i];
            const displayIndex = `${i + 1}/${parsedMenu.items.length}`;
            
            const targetCatId = categoryMapping[item.categoryId];
            if (!targetCatId) {
                console.warn(`⚠️ [${displayIndex}] Пропускаємо товар "${item.name}" - не знайдено категорію.`);
                failCount++;
                continue;
            }

            // Перевірка на дублікат
            const truncatedName = item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name;
            const matchedProduct = existingProducts.find(ep => ep.name.trim().toLowerCase() === truncatedName.trim().toLowerCase());
            if (matchedProduct) {
                console.log(`✅ [${displayIndex}] Товар "${truncatedName}" вже існує на бекенді (ID: ${matchedProduct.id || matchedProduct.productId})`);
                successCount++;
                continue;
            }

            // Зображення
            let imagePath = FALLBACK_IMAGE_PATH;
            let isUsingPlaceholder = true;

            if (item.imageUrl) {
                const tempImageName = `temp_${item.id}.jpg`;
                const tempImagePath = path.join(TEMP_DIR, tempImageName);
                
                try {
                    await downloadFile(item.imageUrl, tempImagePath);
                    imagePath = tempImagePath;
                    isUsingPlaceholder = false;
                } catch (err) {
                    console.warn(`   ⚠️ [${displayIndex}] Не вдалося завантажити зображення для "${item.name}": ${err.message}. Використовуємо плейсхолдер.`);
                }
            }

            const description = item.description || 'Смачна страва від ресторану Рутенія';
            const finalWeight = item.weightGrams > 0 ? item.weightGrams : 100;

            try {
                const fileBuffer = fs.readFileSync(imagePath);
                const ext = path.extname(imagePath).toLowerCase();
                const type = ext === '.png' ? 'image/png' : 'image/jpeg';
                const filename = ext === '.png' ? 'product.png' : 'product.jpg';
                
                const fileBlob = new Blob([fileBuffer], { type });
                
                const productFormData = new FormData();
                productFormData.append('Name', truncatedName);
                productFormData.append('Price', String(item.price));
                productFormData.append('WeightGrams', String(finalWeight));
                productFormData.append('CategoryId', String(targetCatId));
                productFormData.append('Description', description);
                productFormData.append('RestaurantId', String(targetRestaurantId));
                productFormData.append('Image', fileBlob, filename);

                const createProdRes = await fetch(`${BASE_URL}/product`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` },
                    body: productFormData
                });

                if (!createProdRes.ok) {
                    const errText = await createProdRes.text();
                    throw new Error(`${createProdRes.status} ${errText}`);
                }

                const prodIdText = await createProdRes.text();
                const newProductId = parseIdFromText(prodIdText, 'productId');
                console.log(`✅ [${displayIndex}] Товар "${truncatedName}" створено успішно (ID: ${newProductId})` + (isUsingPlaceholder ? ' [з плейсхолдером]' : ''));
                successCount++;
            } catch (err) {
                console.error(`❌ [${displayIndex}] Помилка створення товару "${item.name}":`, err.message);
                failCount++;
            } finally {
                if (!isUsingPlaceholder && fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            await new Promise(r => setTimeout(r, 100));
        }

        console.log(`\n🎉 Імпорт страв завершено! Успішно: ${successCount}, помилок: ${failCount}`);

        // Отримуємо актуальні категорії для формування коректного catalogName у файлі
        console.log('\n📂 Отримуємо оновлені категорії для формування локального каталогу...');
        const updatedCatRes = await fetch(`${BASE_URL}/category`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const categoriesList = await updatedCatRes.json();

        // Завантажуємо кінцевий список продуктів для збереження локального каталогу
        console.log('\n📥 Отримуємо оновлений список товарів з бекенду для локального каталогу...');
        let allProducts = [];
        let page = 1;
        while (true) {
            const res = await fetch(`${BASE_URL}/product?restaurantId=${targetRestaurantId}&pageSize=50&page=${page}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!res.ok) break;
            const data = await res.json();
            const items = data.items || data || [];
            if (!Array.isArray(items) || items.length === 0) break;
            allProducts = allProducts.concat(items);
            if (items.length < 50) break;
            page++;
        }

        // Перетворюємо продукти в необхідний формат для rutenia_food_catalog.json
        const finalCatalog = allProducts.map(p => {
            const cat = categoriesList.find(ec => Number(ec.categoryId || ec.id) === Number(p.categoryId));
            const imgUrl = p.urlBase || p.imageUrl || null;
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                weightGrams: p.weightGrams,
                categoryId: p.categoryId,
                categoryName: cat ? cat.name : 'Невідомо',
                description: p.description,
                image: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}${imgUrl}`) : null
            };
        });

        console.log(`✍️ Записуємо ${finalCatalog.length} товарів у локальні файли rutenia_food_catalog.json...`);
        fs.writeFileSync(ROOT_CATALOG_PATH, JSON.stringify(finalCatalog, null, 4), 'utf-8');
        fs.writeFileSync(SVL_CATALOG_PATH, JSON.stringify(finalCatalog, null, 4), 'utf-8');
        console.log('✅ Локальні каталоги успішно оновлено!');

    } catch (error) {
        console.error('❌ Критична помилка виконання:', error.message);
    }
}

main();
