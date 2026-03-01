import { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectAllProducts, selectAllCategories, selectAllStores } from '../store/catalogSlice';

/**
 * useCatalogFilter handles complex filtering, sorting, and searching logic.
 * It reads directly from the centralized Redux catalogSlice, ensuring
 * UI components are kept clean and purely presentational.
 */
export default function useCatalogFilter() {
    // Read raw data directly from Redux
    const products = useSelector(selectAllProducts);
    const categories = useSelector(selectAllCategories);
    const stores = useSelector(selectAllStores);

    // Local hook states for filtering criteria
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState('all');
    const [sortOrder, setSortOrder] = useState(null); // 'asc', 'desc', or null

    // 1. Filter by Category
    const categoryFilteredProducts = useMemo(() => {
        if (!products) return [];
        if (selectedCategoryId === 'all') return products;

        // Ensure type matching if IDs are mixed (string vs int)
        return products.filter(p => String(p.category_id) === String(selectedCategoryId));
    }, [products, selectedCategoryId]);

    // 2. Filter by Search Query
    const searchFilteredProducts = useMemo(() => {
        if (!searchQuery.trim()) return categoryFilteredProducts;

        const q = searchQuery.toLowerCase().trim();
        return categoryFilteredProducts.filter(p =>
            p.name?.toLowerCase().includes(q) ||
            p.description?.toLowerCase().includes(q) // Assuming products have descriptions
        );
    }, [categoryFilteredProducts, searchQuery]);

    // 3. Search Stores (for search.js global search functionality)
    const searchFilteredStores = useMemo(() => {
        if (!searchQuery.trim() || !stores) return [];

        const q = searchQuery.toLowerCase().trim();
        return stores.filter(s =>
            s.name?.toLowerCase().includes(q) ||
            (s.tags && s.tags.some(t => t.toLowerCase().includes(q)))
        );
    }, [stores, searchQuery]);

    // 4. Apply Final Sorting Selection
    const finalProducts = useMemo(() => {
        // Create a shallow copy to safely sort without mutating Redux state slice
        let list = [...searchFilteredProducts];

        if (sortOrder === 'asc') list.sort((a, b) => a.price - b.price);
        if (sortOrder === 'desc') list.sort((a, b) => b.price - a.price);

        return list;
    }, [searchFilteredProducts, sortOrder]);

    // Computed Helpers
    const hasActiveFilters = selectedCategoryId !== 'all' || searchQuery.trim() !== '' || sortOrder !== null;

    // Quick categories accessor for UI rendering (Active category pill, etc)
    const activeCategory = categories?.find(c => String(c.id) === String(selectedCategoryId));

    return {
        // Raw Data Access (if purely needed)
        categories,
        stores,
        products,

        // Mutators
        searchQuery,
        setSearchQuery,
        selectedCategoryId,
        setSelectedCategoryId,
        sortOrder,
        setSortOrder,

        // Computed Filtered Outputs
        finalProducts,
        searchFilteredStores,

        // Helpers
        hasActiveFilters,
        activeCategory
    };
}
