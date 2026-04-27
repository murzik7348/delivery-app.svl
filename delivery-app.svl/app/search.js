import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import {
  Animated,
  FlatList,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
  RefreshControl,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { fetchCatalog, selectAllProducts, selectAllStores } from '../store/catalogSlice';
import { addToCart } from '../store/cartSlice';
import ProductSheet from '../components/ProductSheet';
import useCatalogFilter from '../hooks/useCatalogFilter';
import BackButton from '../components/BackButton';

export default function SearchScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedProduct, setSelectedProduct] = useState(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const [refreshing, setRefreshing] = useState(false);

  const allProducts = useSelector(selectAllProducts);
  const allStores = useSelector(selectAllStores);

  const topProducts = useMemo(() => {
    // Shuffle and pick 10 top products to show initially
    const shuffled = [...allProducts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, 10);
  }, [allProducts]);

  const topStores = useMemo(() => {
    return [...allStores].sort((a, b) => (b.rating || 0) - (a.rating || 0)).slice(0, 5);
  }, [allStores]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchCatalog()).unwrap();
    } catch (error) {
      console.error('[Search] Refresh failed:', error);
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const { searchQuery, setSearchQuery, finalProducts, searchFilteredStores } = useCatalogFilter();

  const handleChange = useCallback((text) => {
    setSearchQuery(text);
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, setSearchQuery]);

  const ProductResultItem = ({ item }) => {
    const [added, setAdded] = useState(false);
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const handleAdd = () => {
      dispatch(addToCart({ ...item }));
      setAdded(true);
      Animated.sequence([
        Animated.timing(scaleAnim, { toValue: 1.25, duration: 120, useNativeDriver: true }),
        Animated.timing(scaleAnim, { toValue: 1, duration: 120, useNativeDriver: true }),
      ]).start();
      setTimeout(() => setAdded(false), 900);
    };

    return (
      <TouchableOpacity
        style={[styles.productRow, { backgroundColor: theme.card, shadowColor: theme.text }]}
        activeOpacity={0.8}
        onPress={() => setSelectedProduct(item)}
      >
        <Image source={{ uri: item.image }} style={styles.productImg} />
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.productPrice}>{item.price} ₴</Text>
        </View>
        <TouchableOpacity
          onPress={handleAdd}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          activeOpacity={0.8}
        >
          <Animated.View
            style={[
              styles.addBtn,
              {
                backgroundColor: added ? '#2ecc71' : '#e334e3',
                transform: [{ scale: scaleAnim }],
              },
            ]}
          >
            <Ionicons name={added ? 'checkmark' : 'add'} size={20} color="white" />
          </Animated.View>
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }) => <ProductResultItem item={item} />;

  const renderStore = ({ item }) => (
    <TouchableOpacity
      style={[styles.storeRow, { backgroundColor: theme.card, shadowColor: theme.text }]}
      activeOpacity={0.8}
      onPress={() => router.push(`/restaurant/${item.store_id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.storeImg} />
      <View style={styles.storeInfo}>
        <Text style={[styles.storeName, { color: theme.text }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.storeMeta}>
          <Ionicons name="star" size={12} color="#f5c518" />
          <Text style={styles.storeRating}>{item.rating}</Text>
          <Text style={styles.storeDot}>•</Text>
          <Text style={styles.storeTime}>{item.delivery_time}</Text>
        </View>
        <View style={styles.tagRow}>
          {(item.tags || []).slice(0, 2).map((tag, i) => (
            <View key={i} style={[styles.tag, { backgroundColor: theme.input }]}>
              <Text style={[styles.tagText, { color: theme.text }]}>{tag}</Text>
            </View>
          ))}
        </View>
      </View>
      <Ionicons name="chevron-forward" size={18} color="gray" />
    </TouchableOpacity>
  );

  const sections = [];
  
  if (searchQuery.length === 0) {
    if (topStores.length > 0) {
      sections.push({ type: 'header', id: 'h1', label: 'Популярні заклади ⭐️' });
      topStores.forEach(s => sections.push({ type: 'store', id: `s${s.store_id}`, item: s }));
    }
    if (topProducts.length > 0) {
      sections.push({ type: 'header', id: 'h2', label: 'Рекомендуємо спробувати 🔥' });
      topProducts.forEach(p => sections.push({ type: 'product', id: `p${p.product_id}`, item: p }));
    }
  } else {
    if (searchFilteredStores.length > 0) {
      sections.push({ type: 'header', id: 'h1', label: `Заклади (${searchFilteredStores.length})` });
      searchFilteredStores.forEach(s => sections.push({ type: 'store', id: `s${s.store_id}`, item: s }));
    }
    if (finalProducts.length > 0) {
      sections.push({ type: 'header', id: 'h2', label: `Страви та товари (${finalProducts.length})` });
      finalProducts.forEach(p => sections.push({ type: 'product', id: `p${p.product_id}`, item: p }));
    }
  }

  const hasResults = sections.length > 0;

  const renderHeader = () => {
    if (searchQuery.length > 0) return null;
    const categories = ['Піца', 'Бургер', 'Суші', 'Кава', 'Десерти'];
    const emojis = ['🍕', '🍔', '🍣', '☕️', '🍰'];

    return (
      <View style={styles.hintsContainer}>
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 0 }]}>Популярні категорії</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.hintsScroll}>
          {categories.map((hint, idx) => (
            <TouchableOpacity
              key={hint}
              style={[
                styles.hintChip, 
                { backgroundColor: theme.card, borderColor: colorScheme === 'dark' ? '#333' : '#eee', borderWidth: 1 }
              ]}
              onPress={() => handleChange(hint)}
            >
              <Text style={styles.hintEmoji}>{emojis[idx]}</Text>
              <Text style={[styles.hintText, { color: theme.text }]}>{hint}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    );
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      
      <View style={styles.headerWrapper}>
        <BackButton color={theme.text} />
        <View style={[styles.searchBar, { backgroundColor: theme.input }]}>
          <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
          <TextInput
            ref={inputRef}
            style={[styles.input, { color: theme.text }]}
            placeholder="Піца, суші, бургер..."
            placeholderTextColor="gray"
            autoFocus
            value={searchQuery}
            onChangeText={handleChange}
            returnKeyType="search"
            clearButtonMode="never"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => handleChange('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Ionicons name="close-circle" size={18} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <KeyboardAvoidingView 
        style={{ flex: 1 }} 
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {!hasResults && searchQuery.length > 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyEmoji}>😔</Text>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>Нічого не знайдено</Text>
            <Text style={[styles.emptySubtitle, { color: 'gray' }]}>Спробуйте інший запит</Text>
          </View>
        ) : (
          <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
            <FlatList
              data={sections}
              keyExtractor={(item, index) => item.id || index.toString()}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40, paddingTop: 10 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              ListHeaderComponent={renderHeader}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={onRefresh}
                  tintColor="#e334e3"
                  colors={["#e334e3"]}
                />
              }
              renderItem={({ item }) => {
                if (item.type === 'header') {
                  return (
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>{item.label}</Text>
                  );
                }
                if (item.type === 'store') return renderStore({ item: item.item });
                if (item.type === 'product') return renderProduct({ item: item.item });
                return null;
              }}
            />
          </Animated.View>
        )}
      </KeyboardAvoidingView>

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

  headerWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 54,
    borderRadius: 27,
    flex: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  input: { flex: 1, fontSize: 16, height: '100%' },

  hintsContainer: {
    marginBottom: 10,
  },
  hintsScroll: {
    paddingVertical: 5,
    gap: 12,
  },
  hintChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  hintEmoji: {
    fontSize: 16,
    marginRight: 6,
  },
  hintText: {
    fontSize: 14,
    fontWeight: '600',
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  productImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#eee' },
  productInfo: { flex: 1, marginLeft: 14 },
  productName: { fontSize: 16, fontWeight: '600', marginBottom: 6, lineHeight: 20 },
  productPrice: { color: '#e334e3', fontWeight: 'bold', fontSize: 15 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: '#e334e3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 10,
    shadowColor: '#e334e3',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
  },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    marginBottom: 12,
    padding: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  storeImg: { width: 72, height: 72, borderRadius: 16, backgroundColor: '#eee' },
  storeInfo: { flex: 1, marginLeft: 14 },
  storeName: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  storeRating: { fontSize: 13, color: '#f5c518', fontWeight: '600', marginLeft: 4 },
  storeDot: { color: 'gray', marginHorizontal: 6, fontSize: 12 },
  storeTime: { fontSize: 13, color: 'gray', fontWeight: '500' },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  tagText: { fontSize: 11, fontWeight: '600' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyEmoji: { fontSize: 64, marginBottom: 16 },
  emptyTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 8 },
  emptySubtitle: { fontSize: 15, textAlign: 'center', paddingHorizontal: 40 },
});