import { getProducts, getCategories } from '../src/api';
import { categories, promotions, stores, products } from '../data/mockData';

/**
 * CatalogService — fetches real product/category data from the backend API.
 * Falls back to mock data if the API is unreachable.
 */
class CatalogService {

    /**
     * Fetches the full catalog: categories + products from the real backend.
     * @returns {{ categories, products, promotions, stores }}
     */
    static async fetchFullCatalog() {
        try {
            const [apiCategories, apiProductsResponse] = await Promise.all([
                getCategories(),
                getProducts({ page: 1, pageSize: 100 }),
            ]);

            const apiProducts = apiProductsResponse?.items ?? apiProductsResponse ?? [];
            const apiCategoryList = Array.isArray(apiCategories) ? apiCategories : [];

            return {
                categories: apiCategoryList.length > 0 ? apiCategoryList : categories,
                products: apiProducts.length > 0 ? apiProducts : products,
                // promotions and stores are not in the current Swagger; keep mock until backend supports them
                promotions,
                stores,
            };
        } catch (err) {
            console.warn('[CatalogService] API unavailable, using mock data:', err.message);
            // Graceful fallback — app stays functional without a backend
            return new Promise((resolve) => {
                setTimeout(() => resolve({ categories, promotions, stores, products }), 300);
            });
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
            return items.length > 0 ? items : products;
        } catch {
            return products;
        }
    }
}

export default CatalogService;
