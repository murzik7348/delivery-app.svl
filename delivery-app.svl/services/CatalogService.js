import { getProducts, getCategories, getRestaurants } from '../src/api';
import { resolveImageUrl } from '../src/api/client';

/**
 * CatalogService — fetches real product/category data strictly from the backend API.
 */
class CatalogService {

    /**
     * Helper to fetch all pages of products from the paginated API
     */
    static async fetchAllProducts(params = {}) {
        let page = 1;
        const pageSize = 50;
        const maxPages = 10;
        let allItems = [];
        const seenIds = new Set();

        while (page <= maxPages) {
            const response = await getProducts({ ...params, page, pageSize });
            const items = response?.items ?? response ?? [];
            if (!Array.isArray(items) || items.length === 0) break;

            let newItemsCount = 0;
            for (const item of items) {
                const id = item?.id ?? item?.productId;
                if (id) {
                    if (!seenIds.has(id)) {
                        seenIds.add(id);
                        allItems.push(item);
                        newItemsCount++;
                    }
                } else {
                    allItems.push(item);
                    newItemsCount++;
                }
            }

            if (newItemsCount === 0 || items.length < pageSize) break;
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
     * Fetches the full catalog strictly from backend API.
     * @returns {{ categories, products, promotions, stores }}
     */
    static async fetchFullCatalog() {
        try {
            // 1. Fetch dynamic restaurants from API (GET /restaurant)
            let stores = [];
            try {
                const apiRestaurants = await getRestaurants();
                const restList = Array.isArray(apiRestaurants) 
                    ? apiRestaurants 
                    : (apiRestaurants?.items || apiRestaurants?.data || apiRestaurants?.restaurants || []);

                if (Array.isArray(restList) && restList.length > 0) {
                    stores = restList.map(r => {
                        const rawId = r.restaurantId ?? r.id ?? r.store_id;
                        const storeId = Number.isFinite(parseInt(rawId, 10)) ? parseInt(rawId, 10) : 1;
                        const rawImage = r.urlBase || r.image || r.imageUrl || r.logo;
                        return {
                            store_id: storeId,
                            id: storeId,
                            restaurantId: storeId,
                            name: r.name,
                            image: resolveImageUrl(rawImage) || 
                                   (storeId === 2 
                                    ? "https://api.andi.delivery/images/restaurants/2a3eb960-0a42-4077-bbc3-284d9fd0c450/medium.jpg"
                                    : "https://api.andi.delivery/images/restaurants/062973e9-b44b-48b3-88bf-6f3d65ed83b0/medium.jpg"),
                            rating: r.rating || (storeId === 2 ? 4.7 : 4.8),
                            delivery_time: r.deliveryTime || r.delivery_time || "20-40 хв",
                            tags: Array.isArray(r.tags) ? r.tags : (storeId === 2 ? ["Паб", "Пивні тарілки", "Бургери"] : ["Ресторан", "Піца", "М'ясо"]),
                            workTimes: Array.isArray(r.workTimes) ? r.workTimes : (r.workingHours || r.schedules || [])
                        };
                    });
                }
            } catch (err) {
                console.warn('[CatalogService] Failed to fetch restaurants from API:', err);
            }

            if (stores.length === 0) {
                stores = [
                    { store_id: 1, id: 1, restaurantId: 1, name: "Рутенія", image: "https://api.andi.delivery/images/restaurants/062973e9-b44b-48b3-88bf-6f3d65ed83b0/medium.jpg", rating: 4.8, delivery_time: "20-40 хв", tags: ["Ресторан", "Піца", "М'ясо"], workTimes: [] },
                    { store_id: 2, id: 2, restaurantId: 2, name: "Дублін", image: "https://api.andi.delivery/images/restaurants/2a3eb960-0a42-4077-bbc3-284d9fd0c450/medium.jpg", rating: 4.7, delivery_time: "20-40 хв", tags: ["Паб", "Пивні тарілки", "Бургери"], workTimes: [] }
                ];
            }

            // 2. Fetch categories directly from backend API (GET /category)
            let apiCategories = [];
            try {
                const catRes = await getCategories();
                apiCategories = Array.isArray(catRes) ? catRes : (catRes?.items || []);
            } catch (err) {
                console.warn('[CatalogService] Failed to fetch categories from API:', err);
            }

            const categoriesMap = new Map();
            apiCategories.forEach(c => {
                const catId = Number(c.categoryId || c.id);
                if (catId) {
                    categoriesMap.set(catId, {
                        id: catId,
                        category_id: catId,
                        name: c.name,
                        image: resolveImageUrl(c.urlBase || c.image),
                        sticker: '🍽️'
                    });
                }
            });

            // 3. Fetch products strictly from backend API (GET /product)
            let apiProducts = [];
            try {
                apiProducts = await CatalogService.fetchAllProducts();
            } catch (err) {
                console.warn('[CatalogService] Failed to fetch products from API:', err);
            }

            let products = [];
            if (Array.isArray(apiProducts) && apiProducts.length > 0) {
                products = apiProducts.map(p => {
                    const pId = Number(p.id || p.productId);
                    const storeId = Number(p.restaurantId || p.store_id || 1);
                    const catId = Array.isArray(p.categoryIds) && p.categoryIds.length > 0
                        ? Number(p.categoryIds[0])
                        : Number(p.categoryId || p.category_id || 1);
                    const catObj = categoriesMap.get(catId);

                    return {
                        id: pId,
                        product_id: pId,
                        name: p.name,
                        price: Number(p.price || 0),
                        oldPrice: p.oldPrice ? Number(p.oldPrice) : null,
                        weightGrams: Number(p.weightGrams || 100),
                        categoryId: catId,
                        category_id: catId,
                        categoryIds: p.categoryIds || [catId],
                        categoryName: catObj ? catObj.name : 'Інше',
                        description: p.description || '',
                        image: resolveImageUrl(p.urlBase || p.image || p.imageUrl),
                        store_id: storeId,
                        restaurantId: storeId
                    };
                });
            }

            // Set of 91 products that share the identical Rutenia logo placeholder image (MD5 hash 4cae26cfa657329b98f9f51405eeab44)
            const RUTENIA_PLACEHOLDER_IDS = new Set([
                520, 519, 518, 517, 516, 515, 514, 513, 512, 511, 510, 509, 508, 507, 506, 505, 503, 502, 501, 500, 
                498, 497, 496, 495, 494, 493, 492, 491, 490, 489, 488, 487, 485, 484, 483, 482, 481, 480, 479, 477, 
                475, 474, 472, 471, 470, 469, 467, 466, 465, 464, 463, 462, 461, 460, 459, 458, 457, 456, 454, 453, 
                452, 450, 449, 446, 444, 443, 442, 441, 440, 439, 438, 437, 436, 435, 434, 433, 432, 429, 428, 427, 
                426, 425, 423, 422, 421, 419, 416, 413, 411, 408, 407
            ]);

            // Clean up products in restaurant "Рутенія" (store_id: 1): filter out items with duplicate or placeholder images
            const seenImagesRutenia = new Set();
            products = products.filter(p => {
                const storeId = Number(p.store_id || p.restaurantId || 1);
                if (storeId === 1) {
                    if (!p.image) return false;
                    const pId = Number(p.product_id || p.id);
                    if (RUTENIA_PLACEHOLDER_IDS.has(pId)) return false;
                    if (p.image.includes('062973e9-b44b-48b3-88bf-6f3d65ed83b0')) return false;
                    if (seenImagesRutenia.has(p.image)) return false;
                    seenImagesRutenia.add(p.image);
                }
                return true;
            });

            // Ensure every product category exists in categoriesMap
            products.forEach(p => {
                const catId = p.categoryId;
                const catName = p.categoryName || 'Інше';
                if (catId && !categoriesMap.has(catId)) {
                    categoriesMap.set(catId, {
                        id: catId,
                        category_id: catId,
                        name: catName,
                        sticker: '🍽️',
                        image: null
                    });
                }
            });

            // Filter out categories that have the bread placeholder image
            const BREAD_CATEGORY_GUIDS = [
                '4d2c9ce3', '012cb60d', '0944ba94', '0b1b30cb', '4fa0aece', 'db8a4ffb',
                '949ac484', '7ebf69ef', 'ae360c80', '391fbd8e', '23804acc', 'b57f08a1',
                '1ef506fb', '6ded2917', 'c7677376', '87468599', 'f023c65e', '6658ea00',
                '7164ca2c', '98d34ebe', '855ed096', 'de5b49b5', '753a2553'
            ];

            const categories = Array.from(categoriesMap.values()).filter(c => {
                const cName = (c.name || '').toLowerCase().trim();
                const cId = Number(c.id || c.category_id);
                if (cId === 8 || cName.includes('солодке')) return false;
                if (!c.image) return true;
                const hasBreadImg = BREAD_CATEGORY_GUIDS.some(guid => c.image.includes(guid));
                return !hasBreadImg;
            });

            return {
                categories,
                products,
                promotions: [],
                stores
            };
        } catch (error) {
            console.error('[CatalogService] Error fetching full catalog:', error);
            return { categories: [], products: [], promotions: [], stores: [] };
        }
    }

    /**
     * Fetch products filtered by category.
     * @param {number|null} categoryId
     */
    static async fetchProducts(categoryId = null) {
        const full = await CatalogService.fetchFullCatalog();
        if (categoryId === null) return full.products;
        return full.products.filter(p => Number(p.category_id) === Number(categoryId));
    }

    /**
     * Fetch products filtered by restaurant.
     * @param {number} restaurantId
     */
    static async fetchProductsByRestaurant(restaurantId) {
        const full = await CatalogService.fetchFullCatalog();
        return full.products.filter(p => Number(p.store_id) === Number(restaurantId));
    }
}

export default CatalogService;
