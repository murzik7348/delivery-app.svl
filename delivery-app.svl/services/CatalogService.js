import { getProducts, getCategories, getRestaurants } from '../src/api';
import { resolveImageUrl } from '../src/api/client';

// GUID логотипу "Рутенія" — продукти/категорії з цим фото є placeholder
const RUTENIA_LOGO_GUID = '062973e9-b44b-48b3-88bf-6f3d65ed83b0';

/**
 * CatalogService — fetches real product/category data from the backend API.
 */
class CatalogService {


    /**
     * Helper to fetch all pages of products from the paginated API
     */
    static async fetchAllProducts(params = {}) {
        let page = 1;
        let allItems = [];
        while (true) {
            const response = await getProducts({ ...params, page, pageSize: 50 });
            const items = response?.items ?? response ?? [];
            if (!Array.isArray(items) || items.length === 0) break;
            allItems = allItems.concat(items);
            if (items.length < 50) break;
            page++;
        }
        return allItems;
    }

    /**
     * Helper to get categories list
     */
    static async getCategoriesList() {
        try {
            const apiCategories = await getCategories();
            return (Array.isArray(apiCategories) ? apiCategories : []).map(c => ({
                ...c,
                category_id: c.categoryId || c.id
            }));
        } catch {
            return [];
        }
    }

    /**
     * Filter out unwanted drinks and deduplicate products by name (synchronous)
     */
    static filterProducts(productsList, categories) {
        const ALLOWED_DRINKS = ['пепсі', 'pepsi', 'фанта', 'fanta', 'сандора', 'sandora', 'соки'];

        const filteredDrinks = productsList.filter(p => {
            const cat = categories.find(c => Number(c.category_id || c.id) === Number(p.category_id));
            const catName = (cat?.name || '').toLowerCase();

            const isDrink = catName.includes('напої') ||
                catName.includes('фреш') ||
                catName.includes('коктейл') ||
                catName.includes('пиво') ||
                catName.includes('горілк') ||
                catName.includes('бар') ||
                catName.includes('настоянк') ||
                catName.includes('міцні') ||
                catName.includes('вино') ||
                catName.includes('кава') ||
                catName.includes('чай');

            if (isDrink) {
                const nameLower = (p.name || '').toLowerCase();
                return ALLOWED_DRINKS.some(allowed => nameLower.includes(allowed));
            }
            return true;
        });

        const seen = new Set();
        const uniqueProducts = [];
        filteredDrinks.forEach(p => {
            const key = `${p.store_id || 0}_${(p.name || '').trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueProducts.push(p);
            }
        });

        return uniqueProducts;
    }

    /**
     * Maps a raw API product to the app's product shape.
     */
    static mapProduct(p, fallbackRestaurantId = 0) {
        const catId = Array.isArray(p.categoryIds) && p.categoryIds.length > 0
            ? Number(p.categoryIds[0])
            : Number(p.categoryId || p.category_id) || 0;
        return {
            ...p,
            product_id: p.id,
            store_id: Number(p.restaurantId || fallbackRestaurantId) || 0,
            category_id: catId,
            image: resolveImageUrl(p.urlBase || p.imageUrl) || "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500"
        };
    }

    /**
     * Fetches the full catalog: categories + products + restaurants from the real backend.
     * @returns {{ categories, products, promotions, stores }}
     */
    static async fetchFullCatalog() {
        try {
            const [apiCategories, rawProducts, apiRestaurants] = await Promise.all([
                getCategories(),
                CatalogService.fetchAllProducts(),
                getRestaurants(),
            ]);

            const STICKER_MAP = {
                'піца': '🍕', 'піцца': '🍕',
                'суші': '🍣', 'роли': '🍣',
                'бургери': '🍔', 'бургер': '🍔',
                'напої': '🥤', 'безалкогольні напої': '🥤',
                'десерти': '🍰', 'салати': '🥗',
                "м'ясо": '🥩', 'стейки': '🥩',
                'паста': '🍝', 'сніданки': '🍳',
                'снеки': '🍿', 'соуси': '🍯'
            };

            const apiCategoryList = (Array.isArray(apiCategories) ? apiCategories : []).map(c => ({
                ...c,
                category_id: c.categoryId || c.id,
                sticker: STICKER_MAP[(c.name || '').toLowerCase()] || '🍽️',
                image: resolveImageUrl(c.urlBase || c.imageUrl) || null
            }));

            // Тимчасово: видалити категорії з однаковим (placeholder) фото (10526 bytes)
            const PLACEHOLDER_CATEGORY_IDS = [7,4,5,3,2,1,31,30,29,28,27,20,26,19,25,16,24,17,13,21,11,22,23,12,18,9,15,14,10];
            const uniqueCategories = apiCategoryList.filter(c => !PLACEHOLDER_CATEGORY_IDS.includes(c.category_id));

            const allProductsMapped = (rawProducts || []).map(p => CatalogService.mapProduct(p));


            const allFiltered = CatalogService.filterProducts(allProductsMapped, uniqueCategories);

            // Тимчасово: залишити для Рутенії тільки ті продукти, які мають справжні фото (не placeholder 2675 bytes)
            const VALID_RUTENIA_PRODUCTS = [504, 499, 486, 478, 476, 473];
            
            const apiProducts = allFiltered.filter(p => {
                if (Number(p.store_id) === 1) {
                    return VALID_RUTENIA_PRODUCTS.includes(p.product_id);
                }
                return true;
            });

            const apiRestaurantList = Array.isArray(apiRestaurants) ? apiRestaurants : [];

            const stores = apiRestaurantList.map((r, index) => {
                const isString = typeof r === 'string';
                const id = isString ? (index + 1) : (r.restaurantId || r.id);
                const name = isString ? r : (r.name || 'Без назви');

                const restaurantCategoryNames = apiProducts
                    .filter(p => p.store_id == id)
                    .map(p => uniqueCategories.find(c => c.category_id == p.category_id)?.name)
                    .filter(Boolean);

                return {
                    store_id: id,
                    name,
                    image: resolveImageUrl(r.urlBase || r.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
                    rating: r.rating || 4.5,
                    delivery_time: "20-40 хв",
                    tags: Array.from(new Set(["Ресторан", ...restaurantCategoryNames])),
                    workTimes: r.workTimes || [],
                };
            });

            return {
                categories: uniqueCategories,
                products: apiProducts,
                promotions: [],
                stores,
            };
        } catch (err) {
            console.warn('[CatalogService] API unavailable:', err.message);
            return { categories: [], promotions: [], stores: [], products: [] };
        }
    }

    /**
     * Fetch products filtered by restaurant.
     * Runs one API call — no extra getCategoriesList() request.
     * @param {number} restaurantId
     */
    static async fetchProductsByRestaurant(restaurantId) {
        try {
            const items = await CatalogService.fetchAllProducts({ restaurantId });
            const mapped = items.map(p => CatalogService.mapProduct(p, restaurantId));

            // Тимчасово: залишити для Рутенії тільки ті продукти, які мають справжні фото
            if (Number(restaurantId) === 1) {
                const VALID_RUTENIA_PRODUCTS = [504, 499, 486, 478, 476, 473];
                return mapped.filter(p => VALID_RUTENIA_PRODUCTS.includes(p.product_id));
            }
            return mapped;
        } catch {
            return [];
        }
    }
}

export default CatalogService;