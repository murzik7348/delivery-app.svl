import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  useColorScheme,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { toggleFavorite, toggleFavoriteProduct } from '../store/favoritesSlice';
import { fetchCatalog } from '../store/catalogSlice';
import ProductSheet from '../components/ProductSheet';
import BackButton from '../components/BackButton';

export default function FavoritesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCatalog()).unwrap();
    } catch (error) {
      console.error('[Favorites] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const favoriteIds = useSelector(state => state.favorites.ids);
  const favoriteProductIds = useSelector(state => state.favorites.productIds ?? []);
  const stores = useSelector(state => state.catalog.stores);
  const products = useSelector(state => state.catalog.products);

  const [selectedProduct, setSelectedProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('stores');

  const favoriteStores = stores.filter(s => favoriteIds.includes(s.store_id));
  const favoriteProducts = products.filter(p => favoriteProductIds.includes(p.product_id));

  const isEmpty = activeTab === 'stores' ? favoriteStores.length === 0 : favoriteProducts.length === 0;

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Заголовок */}
      <View style={styles.header}>
        <BackButton color={theme.text} />
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'favoritesTitle')} ❤️</Text>
      </View>

      {/* Tabs */}
      <View style={[styles.tabRow, { backgroundColor: theme.card }]}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'stores' && styles.tabActive]}
          onPress={() => setActiveTab('stores')}
        >
          <Ionicons
            name="storefront-outline"
            size={16}
            color={activeTab === 'stores' ? 'white' : 'gray'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'stores' && styles.tabTextActive]}>
            {locale === 'en' ? 'Places' : 'Заклади'} {favoriteStores.length > 0 ? `(${favoriteStores.length})` : ''}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'products' && styles.tabActive]}
          onPress={() => setActiveTab('products')}
        >
          <Ionicons
            name="restaurant-outline"
            size={16}
            color={activeTab === 'products' ? 'white' : 'gray'}
            style={{ marginRight: 6 }}
          />
          <Text style={[styles.tabText, activeTab === 'products' && styles.tabTextActive]}>
            {locale === 'en' ? 'Dishes' : 'Страви'} {favoriteProducts.length > 0 ? `(${favoriteProducts.length})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Контент */}
      {isEmpty ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>{activeTab === 'stores' ? '🏪' : '🍕'}</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>
            {activeTab === 'stores'
              ? (locale === 'en' ? 'No favorite places' : 'Немає улюблених закладів')
              : (locale === 'en' ? 'No favorite dishes' : 'Немає улюблених страв')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: 'gray' }]}>
            {activeTab === 'stores'
              ? (locale === 'en' ? 'Tap ⭐ in a restaurant to add' : 'Натисніть ⭐ у ресторані щоб додати')
              : (locale === 'en' ? 'Tap ❤️ in restaurant menu to add' : 'Натисніть ❤️ у меню ресторану щоб додати')}
          </Text>
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#e334e3"
              colors={["#e334e3"]}
            />
          }
        >
          {activeTab === 'stores'
            ? favoriteStores.map(item => (
              <TouchableOpacity
                key={item.store_id}
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={() => router.push(`/restaurant/${item.store_id}`)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.storeImg} />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: theme.text }]}>{item.name}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="star" size={12} color="#f5c518" />
                    <Text style={styles.metaText}>{item.rating}</Text>
                    <Text style={styles.metaDot}>•</Text>
                    <Text style={styles.metaText}>{item.delivery_time}</Text>
                  </View>
                  <Text style={[styles.tags, { color: 'gray' }]}>{item.tags.join(' · ')}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => dispatch(toggleFavorite(item.store_id))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="heart" size={22} color="#e334e3" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
            : favoriteProducts.map(item => (
              <TouchableOpacity
                key={item.product_id}
                style={[styles.card, { backgroundColor: theme.card }]}
                onPress={() => setSelectedProduct(item)}
                activeOpacity={0.85}
              >
                <Image source={{ uri: item.image }} style={styles.productImg} />
                <View style={styles.cardInfo}>
                  <Text style={[styles.cardName, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
                  <Text style={styles.productPrice}>{item.price} ₴</Text>
                </View>
                <TouchableOpacity
                  onPress={() => dispatch(toggleFavoriteProduct(item.product_id))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="heart" size={22} color="#e334e3" />
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          }
        </ScrollView>
      )}

      {selectedProduct && (
        <ProductSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 6,
    gap: 8,
  },
  title: { fontSize: 26, fontWeight: '800', letterSpacing: -0.3 },

  tabRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    borderRadius: 16,
    padding: 4,
    gap: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
  },
  tabActive: {
    backgroundColor: '#e334e3',
  },
  tabText: { fontSize: 14, fontWeight: '600', color: 'gray' },
  tabTextActive: { color: 'white' },

  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: 100,
  },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
  emptySubtitle: { fontSize: 13, textAlign: 'center', paddingHorizontal: 40 },

  card: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    marginBottom: 12,
    padding: 12,
  },
  storeImg: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#eee' },
  productImg: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#eee' },
  cardInfo: { flex: 1, marginHorizontal: 12 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaText: { fontSize: 12, color: 'gray' },
  metaDot: { color: 'gray', fontSize: 12 },
  tags: { fontSize: 12 },
  productPrice: { color: '#e334e3', fontWeight: '800', fontSize: 15 },
});