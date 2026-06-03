import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useCallback, useRef } from 'react';
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
  Animated,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setBottomBarVisible } from '../store/uiSlice';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { toggleFavorite, toggleFavoriteProduct } from '../store/favoritesSlice';
import { fetchCatalog } from '../store/catalogSlice';
import { formatPrice } from '../store/cartSlice';
import ProductSheet from '../components/ProductSheet';
import BackButton from '../components/BackButton';

export default function FavoritesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
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
  const [tabAnim] = useState(new Animated.Value(activeTab === 'stores' ? 0 : 1));

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    Animated.spring(tabAnim, {
      toValue: tab === 'stores' ? 0 : 1,
      useNativeDriver: false,
      bounciness: 4,
      speed: 12,
    }).start();
  };

  const favoriteStores = stores.filter(s => favoriteIds.includes(s.store_id));
  const favoriteProducts = products.filter(p => favoriteProductIds.includes(p.product_id));

  const lastScrollY = useRef(0);
  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const isScrollingDown = currentOffset > lastScrollY.current;
    
    if (Math.abs(currentOffset - lastScrollY.current) > 15) {
      if (currentOffset <= 0) {
        dispatch(setBottomBarVisible(true));
      } else if (isScrollingDown && currentOffset > 100) {
        dispatch(setBottomBarVisible(false));
      } else {
        dispatch(setBottomBarVisible(true));
      }
      lastScrollY.current = currentOffset;
    }
  };

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
        <Animated.View
          style={[
            styles.animatedTabIndicator,
            { backgroundColor: theme.primary, shadowColor: theme.primary },
            {
              left: tabAnim.interpolate({
                inputRange: [0, 1],
                outputRange: ['1%', '50%'],
              }),
            },
          ]}
        />
        <TouchableOpacity
          style={styles.tab}
          onPress={() => handleTabChange('stores')}
          activeOpacity={0.9}
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
          style={styles.tab}
          onPress={() => handleTabChange('products')}
          activeOpacity={0.9}
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 + insets.bottom }} 
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={theme.primary}
              colors={[theme.primary]}
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
                  <Ionicons name="heart" size={22} color={theme.primary} />
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
                  <Text style={[styles.productPrice, { color: theme.primary }]}>{formatPrice(item.price)} ₴</Text>
                </View>
                <TouchableOpacity
                  onPress={() => dispatch(toggleFavoriteProduct(item.product_id))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="heart" size={22} color={theme.primary} />
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
    position: 'relative',
    borderRadius: 16,
    marginHorizontal: 16,
    marginVertical: 12,
    padding: 4,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  animatedTabIndicator: {
    position: 'absolute',
    top: 4,
    bottom: 4,
    width: '49%',
    backgroundColor: '#000000',
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 3,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    zIndex: 2,
  },
  tabText: { fontSize: 14, fontWeight: '700', color: 'gray' },
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
    borderRadius: 24,
    marginBottom: 12,
    padding: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  storeImg: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#eee' },
  productImg: { width: 70, height: 70, borderRadius: 14, backgroundColor: '#eee' },
  cardInfo: { flex: 1, marginHorizontal: 12 },
  cardName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  metaText: { fontSize: 12, color: 'gray' },
  metaDot: { color: 'gray', fontSize: 12 },
  tags: { fontSize: 12 },
  productPrice: { color: '#000000', fontWeight: '800', fontSize: 15 },
});