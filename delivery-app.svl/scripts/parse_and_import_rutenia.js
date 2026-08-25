const fs = require('fs');
const path = require('path');
const https = require('https');

const CHOICEQR_URL = 'https://ruteniya-svalyava.choiceqr.com/section:menyu';
const BASE_URL = 'https://api.andi.delivery';
const RESTAURANT_ID = 3; // Рутенія

const TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJodHRwOi8vc2NoZW1hcy54bWxzb2FwLm9yZy93cy8yMDA1LzA1L2lkZW50aXR5L2NsYWltcy9uYW1laWRlbnRpZmllciI6IjUzMyIsImh0dHA6Ly9zY2hlbWFzLm1pY3Jvc29mdC5jb20vd3MvMjAwOC8wNi9pZGVudGl0eS9jbGFpbXMvcm9sZSI6IlJlc3RhdXJhbnRVc2VyIiwiZXhwIjoxNzg2OTUwMDMyLCJpc3MiOiJEZWxpdmVyeUFwaSIsImF1ZCI6IkRlbGl2ZXJ5QXBpIn0.ByAJmNNCheSoDuodCMer8OEGUVmOvE0PbMz4xc_UOCc';

const SCRIPTS_DIR = __dirname;
const TEMP_DIR = path.join(SCRIPTS_DIR, 'temp');
const PARSED_MENU_PATH = path.join(SCRIPTS_DIR, 'menu_parsed.json');
const PLACEHOLDER_IMAGE_PATH = '/Users/dimamurza/Desktop/delivery-app/phot/image.png';

const ROOT_CATALOG_PATH = '/Users/dimamurza/Desktop/delivery-app/rutenia_food_catalog.json';
const SVL_CATALOG_PATH = path.join(__dirname, '..', 'rutenia_food_catalog.json');

// Helper: Download file via HTTPS
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

// Helper: Fetch URL text
function fetchText(url) {
    return new Promise((resolve, reject) => {
        https.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        }, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function parseWeight(weightStr) {
    if (!weightStr) return 0;
    const cleaned = String(weightStr).replace(/[^0-9/]/g, '');
    const parts = cleaned.split('/');
    const sum = parts.reduce((acc, part) => acc + (parseInt(part, 10) || 0), 0);
    return sum || 0;
}

const norm = (s) => (s || '').trim().toLowerCase().replace(/[\x27\u02bc\x60\u2019]/g, '');

async function parseChoiceQR() {
    console.log(`🌐 1. Завантажуємо актуальне меню з ChoiceQR (${CHOICEQR_URL})...`);
    const html = await fetchText(CHOICEQR_URL);
    
    const scriptStartTag = '<script id="__NEXT_DATA__" type="application/json">';
    const startIdx = html.indexOf(scriptStartTag);
    if (startIdx === -1) {
        throw new Error('Не знайдено тег __NEXT_DATA__ у відповіді ChoiceQR!');
    }
    
    const dataStartIdx = startIdx + scriptStartTag.length;
    const endIdx = html.indexOf('</script>', dataStartIdx);
    const jsonStr = html.substring(dataStartIdx, endIdx);
    const parsedData = JSON.parse(jsonStr);
    
    const appData = parsedData.props?.app || {};
    const categories = appData.categories || [];
    const menu = appData.menu || [];
    const sections = appData.sections || [];
    
    console.log(`   ✅ Знайдено секцій: ${sections.length}, категорій: ${categories.length}, страв: ${menu.length}`);
    
    const categoryMap = {};
    categories.forEach(c => {
        categoryMap[c._id] = c.name;
    });

    const structuredCategories = categories.map(c => ({
        id: c._id,
        name: c.name,
        hurl: c.hurl,
        description: c.description || ''
    }));
    
    const structuredItems = menu.map(item => {
        let imageUrl = null;
        if (item.media && item.media.length > 0) {
            imageUrl = item.media[0].webp?.url || item.media[0].url || null;
        }
        
        return {
            id: item._id,
            name: item.name,
            description: item.description || '',
            price: item.price ? item.price / 100 : 0,
            weightGrams: parseWeight(item.weight),
            categoryId: item.category,
            categoryName: categoryMap[item.category] || 'Невідомо',
            sectionId: item.section,
            imageUrl: imageUrl,
            available: item.available !== false
        };
    });

    const result = {
        restaurantName: 'Рутенія',
        sections,
        categories: structuredCategories,
        items: structuredItems
    };

    fs.writeFileSync(PARSED_MENU_PATH, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`   💾 Збережено розпарсений каталог у ${PARSED_MENU_PATH}`);
    return result;
}

async function main() {
    try {
        console.log('🚀 === СТАРТ ПАРСИНГУ ТА ІМПОРТУ МЕНЮ РЕСТОРАНУ РУТЕНІЯ ===\n');

        if (!fs.existsSync(PLACEHOLDER_IMAGE_PATH)) {
            throw new Error(`Не знайдено центрований логотип-плейсхолдер: ${PLACEHOLDER_IMAGE_PATH}`);
        }

        if (!fs.existsSync(TEMP_DIR)) {
            fs.mkdirSync(TEMP_DIR, { recursive: true });
        }

        // 1. Парсимо актуальне меню ChoiceQR
        const parsedMenu = await parseChoiceQR();

        // 2. Отримуємо категорії з бекенду (з pageSize=100)
        console.log('\n📂 2. Отримуємо категорії з бекенду...');
        const catRes = await fetch(`${BASE_URL}/category?pageSize=100`, {
            headers: { 'Authorization': `Bearer ${TOKEN}` }
        });
        if (!catRes.ok) {
            throw new Error(`Не вдалося отримати категорії з бекенду: ${catRes.status}`);
        }
        const backendCategories = await catRes.json();
        console.log(`   ✅ Отримано ${backendCategories.length} категорій з бекенду.`);

        // Зіставляємо категорії ChoiceQR з бекендом
        const categoryMapping = {};
        parsedMenu.categories.forEach(choiceCat => {
            const matched = backendCategories.find(bc => norm(bc.name) === norm(choiceCat.name));
            if (matched) {
                const bId = matched.categoryId || matched.id;
                categoryMapping[choiceCat.id] = bId;
                console.log(`   🔗 Категорія "${choiceCat.name}" -> Backend ID: ${bId}`);
            } else {
                console.warn(`   ⚠️ Категорію "${choiceCat.name}" не знайдено на бекенді!`);
            }
        });

        // 3. Отримуємо наявні товари на бекенді для ресторану 3
        console.log(`\n🍲 3. Перевіряємо наявні страви для ресторану ${RESTAURANT_ID} на бекенді...`);
        let existingProducts = [];
        let pPage = 1;
        while (true) {
            const pRes = await fetch(`${BASE_URL}/product?restaurantId=${RESTAURANT_ID}&pageSize=50&page=${pPage}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!pRes.ok) break;
            const pData = await pRes.json();
            const items = pData.items || pData || [];
            if (!Array.isArray(items) || items.length === 0) break;
            existingProducts = existingProducts.concat(items);
            if (items.length < 50) break;
            pPage++;
        }
        console.log(`   ✅ Знайдено ${existingProducts.length} існуючих страв у ресторані на бекенді.`);

        // 4. Починаємо імпорт страв
        console.log(`\n🍲 4. Починаємо імпорт ${parsedMenu.items.length} страв...`);
        let successCount = 0;
        let skipCount = 0;
        let failCount = 0;

        for (let i = 0; i < parsedMenu.items.length; i++) {
            const item = parsedMenu.items[i];
            const displayIndex = `${i + 1}/${parsedMenu.items.length}`;
            
            const targetCatId = categoryMapping[item.categoryId];
            if (!targetCatId) {
                console.warn(`⚠️ [${displayIndex}] Пропуск "${item.name}" — відсутня відповідна категорія на бекенді.`);
                failCount++;
                continue;
            }

            // Перевіряємо, чи вже створено страву з такою назвою
            let cleanItemName = item.name.trim();
            if (cleanItemName.length > 50) {
                cleanItemName = cleanItemName.substring(0, 47) + '...';
            }
            const alreadyExists = existingProducts.find(ep => norm(ep.name) === norm(cleanItemName) || norm(ep.name) === norm(item.name));
            if (alreadyExists) {
                console.log(`⏩ [${displayIndex}] "${cleanItemName}" вже існує (ID: ${alreadyExists.id})`);
                skipCount++;
                continue;
            }

            // Завантаження або плейсхолдер
            let imagePath = PLACEHOLDER_IMAGE_PATH;
            let isUsingPlaceholder = true;

            if (item.imageUrl) {
                const tempImageName = `temp_${item.id}.jpg`;
                const tempImagePath = path.join(TEMP_DIR, tempImageName);
                try {
                    await downloadFile(item.imageUrl, tempImagePath);
                    imagePath = tempImagePath;
                    isUsingPlaceholder = false;
                } catch (err) {
                    console.warn(`   ⚠️ [${displayIndex}] Помилка завантаження фото для "${item.name}": ${err.message}. Використовуємо центрований логотип.`);
                }
            }

            const description = item.description || `Страва ресторану Рутенія: ${cleanItemName}`;
            const finalWeight = item.weightGrams > 0 ? item.weightGrams : 100;
            const finalPrice = item.price > 0 ? item.price : 100;

            try {
                const fileBuffer = fs.readFileSync(imagePath);
                const ext = path.extname(imagePath).toLowerCase();
                const mimeType = ext === '.png' ? 'image/png' : (ext === '.webp' ? 'image/webp' : 'image/jpeg');
                const filename = ext === '.png' ? 'product.png' : 'product.jpg';
                const fileBlob = new Blob([fileBuffer], { type: mimeType });

                const productFormData = new FormData();
                productFormData.append('Name', cleanItemName);
                productFormData.append('Price', String(finalPrice));
                productFormData.append('WeightGrams', String(finalWeight));
                productFormData.append('CategoryIds', String(targetCatId));
                productFormData.append('Description', description);
                productFormData.append('RestaurantId', String(RESTAURANT_ID));
                productFormData.append('Image', fileBlob, filename);

                const createRes = await fetch(`${BASE_URL}/product`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${TOKEN}` },
                    body: productFormData
                });

                if (!createRes.ok) {
                    const errText = await createRes.text();
                    throw new Error(`${createRes.status}: ${errText}`);
                }

                const resData = await createRes.json();
                const newId = resData.productId || resData.id || JSON.stringify(resData);
                console.log(`✅ [${displayIndex}] Створено: "${cleanItemName}" (ID: ${newId})${isUsingPlaceholder ? ' [Центрований логотип]' : ' [Оригінальне фото]'}`);
                successCount++;
            } catch (err) {
                console.error(`❌ [${displayIndex}] Помилка створення "${item.name}":`, err.message);
                failCount++;
            } finally {
                if (!isUsingPlaceholder && fs.existsSync(imagePath)) {
                    fs.unlinkSync(imagePath);
                }
            }

            // Невелика затримка для стабільності
            await new Promise(r => setTimeout(r, 120));
        }

        console.log(`\n🎉 Імпорт завершено! Створено нових: ${successCount}, пропущено існуючих: ${skipCount}, помилок: ${failCount}`);

        // 5. Отримуємо повний фінальний список продуктів та оновлюємо локальні каталоги
        console.log('\n📥 5. Завантажуємо повний список товарів для формування rutenia_food_catalog.json...');
        let allProducts = [];
        let finalPage = 1;
        while (true) {
            const res = await fetch(`${BASE_URL}/product?restaurantId=${RESTAURANT_ID}&pageSize=50&page=${finalPage}`, {
                headers: { 'Authorization': `Bearer ${TOKEN}` }
            });
            if (!res.ok) break;
            const data = await res.json();
            const items = data.items || data || [];
            if (!Array.isArray(items) || items.length === 0) break;
            allProducts = allProducts.concat(items);
            if (items.length < 50) break;
            finalPage++;
        }

        const finalCatalog = allProducts.map(p => {
            const catId = Array.isArray(p.categoryIds) && p.categoryIds.length > 0 ? p.categoryIds[0] : p.categoryId;
            const cat = backendCategories.find(bc => Number(bc.categoryId || bc.id) === Number(catId));
            const imgUrl = p.urlBase || p.imageUrl || null;
            return {
                id: p.id,
                name: p.name,
                price: p.price,
                weightGrams: p.weightGrams,
                categoryId: catId,
                categoryName: cat ? cat.name : 'Невідомо',
                description: p.description,
                image: imgUrl ? (imgUrl.startsWith('http') ? imgUrl : `${BASE_URL}${imgUrl}`) : null
            };
        });

        console.log(`✍️ Записуємо ${finalCatalog.length} страв у локальні файли rutenia_food_catalog.json...`);
        fs.writeFileSync(ROOT_CATALOG_PATH, JSON.stringify(finalCatalog, null, 4), 'utf-8');
        fs.writeFileSync(SVL_CATALOG_PATH, JSON.stringify(finalCatalog, null, 4), 'utf-8');
        console.log('✅ Локальні каталоги успішно оновлено!');

        console.log('\n🌟 УСЕ ВИКОНАНО УСПІШНО! 🌟');
    } catch (err) {
        console.error('\n❌ Критична помилка:', err.message);
    }
}

main();
