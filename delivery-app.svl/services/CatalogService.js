import { getProducts, getCategories, getRestaurants } from '../src/api';
import { resolveImageUrl } from '../src/api/client';

/**
 * CatalogService — fetches real product/category data from the backend API.
 * Falls back to empty arrays if the API is unreachable.
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
            if (items.length < 20) break;
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
     * Helper to filter out unwanted drinks and deduplicate products by name
     */
    static async filterProducts(productsList, categories) {
        const ALLOWED_DRINKS = ['пепсі', 'pepsi', 'фанта', 'fanta', 'сандора', 'sandora', 'соки'];
        
        // 1. Фільтруємо напої (залишаємо тільки Pepsi, Fanta, Sandora)
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
                const nameLower = p.name.toLowerCase();
                return ALLOWED_DRINKS.some(allowed => nameLower.includes(allowed));
            }
            return true;
        });

        // 2. Прибираємо дублікати за назвою в межах кожного закладу (store_id)
        const seen = new Set();
        const uniqueProducts = [];
        filteredDrinks.forEach(p => {
            const key = `${p.store_id}_${p.name.trim().toLowerCase()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueProducts.push(p);
            }
        });

        return uniqueProducts;
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

            // Map categories to ensure category_id is set
            const STICKER_MAP = {
                'піца': '🍕',
                'піцца': '🍕',
                'суші': '🍣',
                'роли': '🍣',
                'бургери': '🍔',
                'бургер': '🍔',
                'напої': '🥤',
                'безалкогольні напої': '🥤',
                'десерти': '🍰',
                'салати': '🥗',
                'м\'ясо': '🥩',
                'стейки': '🥩',
                'паста': '🍝',
                'сніданки': '🍳',
                'снеки': '🍿',
                'соуси': '🍯'
            };

            const apiCategoryList = (Array.isArray(apiCategories) ? apiCategories : []).map(c => {
                const nameLower = (c.name || '').toLowerCase();
                const sticker = STICKER_MAP[nameLower] || '🍽️';
                
                return {
                    ...c,
                    category_id: c.categoryId || c.id,
                    sticker: sticker,
                    image: resolveImageUrl(c.urlBase || c.imageUrl) || null
                };
            });

            // Map products
            const allProductsMapped = (rawProducts || []).map(p => ({
                ...p,
                product_id: p.id,
                store_id: p.restaurantId,
                category_id: p.categoryId,
                image: resolveImageUrl(p.urlBase || p.imageUrl) || "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500"
            }));

            // Filter and deduplicate
            const apiProducts = await CatalogService.filterProducts(allProductsMapped, apiCategoryList);

            const apiRestaurantList = Array.isArray(apiRestaurants) ? apiRestaurants : [];

            // Map backend restaurants to 'stores' structure expected by UI
            const stores = apiRestaurantList.map((r, index) => {
                const isString = typeof r === 'string';
                const id = isString ? (index + 1) : (r.restaurantId || r.id);
                const name = isString ? r : (r.name || 'Без назви');
                
                const restaurantCategoryNames = apiProducts
                    .filter(p => p.store_id == id)
                    .map(p => apiCategoryList.find(c => c.category_id == p.category_id)?.name)
                    .filter(Boolean);

                const tags = Array.from(new Set(["Ресторан", ...restaurantCategoryNames]));

                return {
                    store_id: id,
                    name: name,
                    image: resolveImageUrl(r.urlBase || r.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800",
                    rating: r.rating || 4.5,
                    delivery_time: "20-40 хв",
                    tags: tags,
                    workTimes: r.workTimes || [],
                };
            });

            return {
                categories: apiCategoryList,
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
     * Fetch products filtered by category.
     * @param {number|null} categoryId
     */
    static async fetchProducts(categoryId = null) {
        try {
            const items = await CatalogService.fetchAllProducts({ categoryId });
            const mappedItems = items.map(p => ({
                ...p,
                product_id: p.id,
                store_id: p.restaurantId,
                category_id: p.categoryId,
                image: resolveImageUrl(p.urlBase || p.imageUrl) || "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500"
            }));
            const categories = await CatalogService.getCategoriesList();
            return CatalogService.filterProducts(mappedItems, categories);
        } catch {
            return [];
        }
    }

    /**
     * Fetch products filtered by restaurant.
     * @param {number} restaurantId
     */
    static async fetchProductsByRestaurant(restaurantId) {
        try {
            const items = await CatalogService.fetchAllProducts({ restaurantId });
            const mappedItems = items.map(p => ({
                ...p,
                product_id: p.id,
                store_id: p.restaurantId,
                category_id: p.categoryId,
                image: resolveImageUrl(p.urlBase || p.imageUrl) || "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500"
            }));
            const categories = await CatalogService.getCategoriesList();
            return CatalogService.filterProducts(mappedItems, categories);
        } catch {
            return [];
        }
    }
}

export default CatalogService;
