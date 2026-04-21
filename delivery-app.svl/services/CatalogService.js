import { getProducts, getCategories, getRestaurants } from '../src/api';
import { resolveImageUrl } from '../src/api/client';

/**
 * CatalogService — fetches real product/category data from the backend API.
 * Falls back to empty arrays if the API is unreachable (mock data removed).
 */
class CatalogService {

    /**
     * Fetches the full catalog: categories + products + restaurants from the real backend.
     * @returns {{ categories, products, promotions, stores }}
     */
    static async fetchFullCatalog() {
        try {
            const [apiCategories, apiProductsResponse, apiRestaurants] = await Promise.all([
                getCategories(),
                getProducts({ page: 1, pageSize: 100 }),
                getRestaurants(),
            ]);

            // Products from the backend come with `id` instead of `product_id` but the UI uses `product_id` everywhere.
            const apiProducts = (apiProductsResponse?.items ?? apiProductsResponse ?? []).map(p => ({
                ...p,
                product_id: p.id,
                store_id: p.restaurantId,
                category_id: p.categoryId, // Backend uses categoryId
                image: resolveImageUrl(p.urlBase || p.imageUrl) || "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500" // Fallback image
            }));

            // Map categories to ensure category_id is set
            const STICKER_MAP = {
                'піца': '🍕',
                'піцца': '🍕',
                'суші': '🍣',
                'роли': '🍣',
                'бургери': '🍔',
                'бургер': '🍔',
                'напої': '🥤',
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
                    image: resolveImageUrl(c.imageUrl) || null // Use null if no image, UI will handle sticker
                };
            });

            const apiRestaurantList = Array.isArray(apiRestaurants) ? apiRestaurants : [];

            // Map backend restaurants to 'stores' structure expected by UI
            const stores = apiRestaurantList.map((r, index) => {
                const isString = typeof r === 'string';
                const id = isString ? (index + 1) : (r.id || r.restaurantId);
                const name = isString ? r : (r.name || 'Без назви');
                
                // Collect category names from products belonging to this restaurant
                // to use as tags for filtering on the Home screen.
                const restaurantCategoryNames = apiProducts
                    .filter(p => p.store_id == id)
                    .map(p => apiCategoryList.find(c => c.category_id == p.category_id)?.name)
                    .filter(Boolean);

                const tags = Array.from(new Set(["Ресторан", ...restaurantCategoryNames]));

                return {
                    store_id: id,
                    name: name,
                    image: resolveImageUrl(r.imageUrl) || "https://images.unsplash.com/photo-1542838132-92c53300491e?w=800", // Fallback image wrapper
                    rating: r.rating || 4.5,
                    delivery_time: "20-40 хв",
                    tags: tags,
                };
            });

            return {
                categories: apiCategoryList,
                products: apiProducts,
                // promotions not in the current Swagger; keep empty until backend supports them
                promotions: [],
                stores,
            };
        } catch (err) {
            console.warn('[CatalogService] API unavailable:', err.message);
            // Graceful fallback — app stays functional without a backend but with empty data
            return { categories: [], promotions: [], stores: [], products: [] };
        }
    }

    /**
     * Fetch products filtered by category.
     * @param {number|null} categoryId
     */
    static async fetchProducts(categoryId = null) {
        try {
            const response = await getProducts({ categoryId, pageSize: 100 });
            const items = response?.items ?? response ?? [];
            return items;
        } catch {
            return [];
        }
    }
}

export default CatalogService;
