import { getProducts, getCategories, getRestaurants } from '../src/api';
import { resolveImageUrl, resolveProductImageUrl } from '../src/api/client';

// GUID логотипу "Рутенія" — продукти/категорії з цим фото є placeholder
const RUTENIA_LOGO_GUID = '062973e9-b44b-48b3-88bf-6f3d65ed83b0';

export const DEFAULT_PROMOTIONS = [
    {
        id: 1,
        title: 'Спеціальна пропозиція від K&M Delivery',
        description: 'Спробуйте нові авторські страви та сети від шеф-кухаря. Швидка та надійна доставка прямо до ваших дверей!',
        tag: 'АКЦІЯ',
        tagColor: '#e334e3',
        image: require('../assets/images/promo_banner.png'),
    }
];

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
        const seen = new Set();
        const uniqueProducts = [];
        (productsList || []).forEach(p => {
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

        const rawPath = p.urlBase || p.imageUrl || p.image;
        const fallbackUrl = "https://images.unsplash.com/photo-1549931319-a545dcf3bc73?w=500";

        return {
            ...p,
            product_id: p.id,
            store_id: Number(p.restaurantId || fallbackRestaurantId) || 0,
            category_id: catId,
            image: resolveImageUrl(rawPath) || fallbackUrl,
            imageThumb: resolveProductImageUrl(rawPath, 'thumb') || resolveImageUrl(rawPath) || fallbackUrl,
            imageMedium: resolveProductImageUrl(rawPath, 'medium') || resolveImageUrl(rawPath) || fallbackUrl,
            imageOriginal: resolveProductImageUrl(rawPath, 'original') || resolveImageUrl(rawPath) || fallbackUrl,
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

            const ALLOWED_CATEGORIES_CONFIG = {
                35: { sticker: '🍝', keyword: 'мучн' },
                34: { sticker: '🍔', keyword: 'бургер' },
                24: { sticker: '🍹', keyword: 'фреш' },
                23: { sticker: '🥤', keyword: 'безалкоголь' },
                22: { sticker: '🍕', keyword: 'піц' },
                21: { sticker: '🌯', keyword: 'лаваш' },
                20: { sticker: '🍳', keyword: 'снідан' },
                19: { sticker: '🍟', keyword: 'закус' },
                18: { sticker: '🥘', keyword: 'сковорідк' },
                17: { sticker: '🥣', keyword: 'перш' },
                16: { sticker: '🍚', keyword: 'гарнір' },
                15: { sticker: '🍰', keyword: 'десерт' },
                14: { sticker: '🥨', keyword: 'пивн' },
                13: { sticker: '🥩', keyword: 'інші страви з м' },
                11: { sticker: '🍢', keyword: 'мангал' },
            };

            const getCategoryStickerIfAllowed = (c) => {
                const catId = Number(c?.categoryId || c?.id);
                const nameLower = (c?.name || '').toLowerCase().trim();

                // 1. Direct ID match
                if (ALLOWED_CATEGORIES_CONFIG[catId]) {
                    return ALLOWED_CATEGORIES_CONFIG[catId].sticker;
                }

                // 2. Exact keyword match by name
                for (const item of Object.values(ALLOWED_CATEGORIES_CONFIG)) {
                    if (nameLower.includes(item.keyword)) {
                        return item.sticker;
                    }
                }

                // Дефолтна іконка для будь-якої іншої категорії
                return '🍽️';
            };

            const seenCategoryKeys = new Set();
            const uniqueCategories = [];

            (Array.isArray(apiCategories) ? apiCategories : []).forEach(c => {
                const catId = Number(c.categoryId || c.id);
                const nameLower = (c.name || '').toLowerCase().trim();
                const sticker = getCategoryStickerIfAllowed(c) || '🍽️';

                if (nameLower && !seenCategoryKeys.has(catId) && !seenCategoryKeys.has(nameLower)) {
                    seenCategoryKeys.add(catId);
                    seenCategoryKeys.add(nameLower);
                    uniqueCategories.push({
                        ...c,
                        category_id: catId,
                        sticker,
                        image: resolveImageUrl(c.urlBase || c.imageUrl) || null
                    });
                }
            });

            const validCatIds = new Set(uniqueCategories.map(c => Number(c.category_id)));

            const allProductsMapped = (rawProducts || []).map(p => CatalogService.mapProduct(p));

            const allFiltered = CatalogService.filterProducts(allProductsMapped, uniqueCategories);

            const apiProducts = allFiltered.filter(p => {
                if (!validCatIds.has(Number(p.category_id))) return false;
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
                promotions: DEFAULT_PROMOTIONS,
                stores,
            };
        } catch (err) {
            console.warn('[CatalogService] API unavailable:', err.message);
            return { categories: [], promotions: DEFAULT_PROMOTIONS, stores: [], products: [] };
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

            // Повертаємо всі товари ресторану
            return mapped;
        } catch {
            return [];
        }
    }
}

export default CatalogService;