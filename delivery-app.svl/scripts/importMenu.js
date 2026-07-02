const fs = require('fs');
const path = require('path');
const https = require('https');
const readline = require('readline');

const BASE_URL = 'https://api.andi.delivery';
const PARSED_MENU_PATH = path.join(__dirname, 'menu_parsed.json');
const TEMP_DIR = path.join(__dirname, 'temp');
const PLACEHOLDER_URL = 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500';
const PLACEHOLDER_PATH = path.join(__dirname, 'placeholder.jpg');

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });
    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }));
}

function downloadFile(url, destPath) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(destPath);
        https.get(url, (response) => {
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
            throw new Error(`Не знайдено файл розпарсеного меню: ${PARSED_MENU_PATH}. Запустіть спочатку parseChoiceQR.js.`);
        }
        
        const parsedMenu = JSON.parse(fs.readFileSync(PARSED_MENU_PATH, 'utf-8'));
        
        console.log('--- Авторизація на бекенді ---');
        let phone = await askQuestion('Введіть номер телефону (+380...): ');
        
        let digits = phone.replace(/\D/g, '');
        if (digits.startsWith('380') && digits.length === 12) {
            phone = '+' + digits;
        } else if (digits.startsWith('0') && digits.length === 10) {
            phone = '+380' + digits.substring(1);
        } else if (digits.length === 9) {
            phone = '+380' + digits;
        } else {
            phone = '+' + digits;
        }
        
        const password = await askQuestion('Введіть пароль: ');
        
        console.log('\n🔐 Входимо в систему...');
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
            throw new Error('Токен авторизації не знайдено у відповіді сервера!');
        }
        console.log('✅ Авторизовано успішно!');
        
        console.log('\n🏨 Отримання списку ресторанів...');
        const restRes = await fetch(`${BASE_URL}/restaurant`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!restRes.ok) {
            throw new Error(`Не вдалося отримати ресторани: ${restRes.status}`);
        }
        const restaurants = await restRes.json();
        
        if (restaurants.length === 0) {
            throw new Error('У вашому профілі немає доступних ресторанів!');
        }
        
        console.log('Доступні ресторани:');
        restaurants.forEach((r, idx) => {
            console.log(`[${idx + 1}] ID: ${r.restaurantId || r.id} - ${r.name}`);
        });
        
        const selectionStr = await askQuestion('\nОберіть номер ресторану або введіть потрібний ID: ');
        let targetRestaurantId = null;
        const selectionIdx = parseInt(selectionStr, 10) - 1;
        
        if (selectionIdx >= 0 && selectionIdx < restaurants.length) {
            const selected = restaurants[selectionIdx];
            targetRestaurantId = selected.restaurantId || selected.id;
        } else {
            targetRestaurantId = parseInt(selectionStr, 10);
        }
        
        if (!targetRestaurantId || isNaN(targetRestaurantId)) {
            throw new Error('Некоректний вибір ресторану.');
        }
        
        console.log(`🎯 Вибрано Restaurant ID: ${targetRestaurantId}`);
        
        // Переконуємось у наявності тимчасових папок
        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }
        
        // Скачуємо дефолтне зображення-плейсхолдер
        if (!fs.existsSync(PLACEHOLDER_PATH)) {
            console.log('🖼️ Скачуємо дефолтний плейсхолдер для товарів без картинок...');
            try {
                await downloadFile(PLACEHOLDER_URL, PLACEHOLDER_PATH);
            } catch (err) {
                console.warn('⚠️ Не вдалося завантажити оригінальний плейсхолдер. Створюємо пустий файл.');
                fs.writeFileSync(PLACEHOLDER_PATH, '');
            }
        }
        
        // Отримуємо існуючі категорії, щоб не створювати дублікати
        console.log('\n📂 Перевіряємо наявні категорії на бекенді...');
        const catRes = await fetch(`${BASE_URL}/category`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!catRes.ok) {
            throw new Error(`Не вдалося отримати категорії: ${catRes.status}`);
        }
        const existingCategories = await catRes.json();
        console.log(`Знайдено ${existingCategories.length} існуючих категорій.`);
        
        const categoryMapping = {};
        // Заповнюємо мапу для тих категорій, які вже існують на бекенді (порівняння за назвою без урахування регістру)
        parsedMenu.categories.forEach(c => {
            const matched = existingCategories.find(ec => ec.name.trim().toLowerCase() === c.name.trim().toLowerCase());
            if (matched) {
                categoryMapping[c.id] = matched.categoryId || matched.id;
                console.log(`   - Категорія "${c.name}" вже існує на бекенді (ID: ${categoryMapping[c.id]})`);
            }
        });
        
        // Створюємо відсутні категорії
        console.log('\n📁 Створюємо нові категорії...');
        for (const c of parsedMenu.categories) {
            if (categoryMapping[c.id]) continue;
            
            console.log(`   - Створення категорії "${c.name}"...`);
            
            const fileBuffer = fs.readFileSync(PLACEHOLDER_PATH);
            const fileBlob = new Blob([fileBuffer], { type: 'image/jpeg' });
            
            const formData = new FormData();
            formData.append('Name', c.name.trim());
            formData.append('Image', fileBlob, 'category.jpg');
            
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
        
        // Отримуємо наявні товари на бекенді, щоб запобігти дублікатам
        console.log('\n🍲 Перевіряємо наявні товари на бекенді...');
        const prodListRes = await fetch(`${BASE_URL}/product?restaurantId=${targetRestaurantId}&pageSize=300`, {
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
                console.warn(`⚠️ [${displayIndex}] Скидаємо товар "${item.name}" - не знайдено категорію.`);
                failCount++;
                continue;
            }
            
            // Підготовка імені та перевірка на дублікат
            const truncatedName = item.name.length > 50 ? item.name.substring(0, 47) + '...' : item.name;
            const matchedProduct = existingProducts.find(ep => ep.name.trim().toLowerCase() === truncatedName.trim().toLowerCase());
            if (matchedProduct) {
                console.log(`✅ [${displayIndex}] Товар "${truncatedName}" вже існує на бекенді (ID: ${matchedProduct.id || matchedProduct.productId})`);
                successCount++;
                continue;
            }
            
            // Тимчасово скачуємо зображення
            let imagePath = PLACEHOLDER_PATH;
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
            const finalWeight = item.weightGrams > 0 ? item.weightGrams : 100; // Вага не може бути 0
            
            try {
                const fileBuffer = fs.readFileSync(imagePath);
                const fileBlob = new Blob([fileBuffer], { type: 'image/jpeg' });
                
                const productFormData = new FormData();
                productFormData.append('Name', truncatedName);
                productFormData.append('Price', String(item.price));
                productFormData.append('WeightGrams', String(finalWeight));
                productFormData.append('CategoryId', String(targetCatId));
                productFormData.append('Description', description);
                productFormData.append('RestaurantId', String(targetRestaurantId));
                productFormData.append('Image', fileBlob, 'product.jpg');
                
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
                // Видаляємо тимчасовий файл зображення, якщо це не плейсхолдер
                if (!isUsingPlaceholder && fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }
            
            // Невеликий інтервал між запитами, щоб не блокувати сервер
            await new Promise(r => setTimeout(r, 100));
        }
        
        console.log(`\n🎉 Імпорт завершено!`);
        console.log(`   - Успішно завантажено товарів: ${successCount}`);
        console.log(`   - Помилок: ${failCount}`);
        
    } catch (error) {
        console.error('❌ Критична помилка виконання:', error.message);
    }
}

main();
