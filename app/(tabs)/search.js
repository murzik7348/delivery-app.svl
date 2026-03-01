import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { selectAllProducts, selectAllStores } from '../../store/catalogSlice';
import { addToCart } from '../../store/cartSlice';
import ProductSheet from '../../components/ProductSheet';
import useCatalogFilter from '../../hooks/useCatalogFilter';

export default function SearchScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [selectedProduct, setSelectedProduct] = useState(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Use the global catalog filter instead of local memos
  const { searchQuery, setSearchQuery, finalProducts, searchFilteredStores, hasActiveFilters } = useCatalogFilter();

  const hasResults = finalProducts.length > 0 || searchFilteredStores.length > 0;

  const handleChange = useCallback((text) => {
    setSearchQuery(text);
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  const clearQuery = () => {
    setQuery('');
    inputRef.current?.focus();
  };

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
        style={[styles.productRow, { backgroundColor: theme.card }]}
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
      style={[styles.storeRow, { backgroundColor: theme.card }]}
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
  if (searchFilteredStores.length > 0) {
    sections.push({ type: 'header', id: 'h1', label: `Заклади (${searchFilteredStores.length})` });
    searchFilteredStores.forEach(s => sections.push({ type: 'store', id: `s${s.store_id}`, item: s }));
  }
  if (finalProducts.length > 0) {
    sections.push({ type: 'header', id: 'h2', label: `Страви та товари (${finalProducts.length})` });
    finalProducts.forEach(p => sections.push({ type: 'product', id: `p${p.product_id}`, item: p }));
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

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
          <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="close-circle" size={18} color="gray" />
          </TouchableOpacity>
        )}
      </View>

      {searchQuery.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>🔍</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Що шукаємо?</Text>
          <Text style={[styles.emptySubtitle, { color: 'gray' }]}>
            Введіть назву страви або ресторану
          </Text>
          <View style={styles.hintRow}>
            {['Піца', 'Бургер', 'Суші', 'Кава'].map(hint => (
              <TouchableOpacity
                key={hint}
                style={[styles.hintChip, { backgroundColor: theme.card }]}
                onPress={() => handleChange(hint)}
              >
                <Text style={[styles.hintText, { color: theme.text }]}>{hint}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      ) : !hasResults ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyEmoji}>😔</Text>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Нічого не знайдено</Text>
          <Text style={[styles.emptySubtitle, { color: 'gray' }]}>Спробуйте інший запит</Text>
        </View>
      ) : (
        <Animated.View style={{ flex: 1, opacity: fadeAnim }}>
          <FlatList
            data={sections}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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

  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 14,
    height: 50,
    borderRadius: 16,
  },
  input: { flex: 1, fontSize: 16 },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 18,
    marginBottom: 10,
  },

  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    padding: 10,
  },
  productImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee' },
  productInfo: { flex: 1, marginLeft: 12 },
  productName: { fontSize: 15, fontWeight: '600', marginBottom: 4 },
  productPrice: { color: '#e334e3', fontWeight: 'bold', fontSize: 14 },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 12,
    backgroundColor: '#e334e3',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },

  storeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    marginBottom: 10,
    padding: 10,
  },
  storeImg: { width: 64, height: 64, borderRadius: 12, backgroundColor: '#eee' },
  storeInfo: { flex: 1, marginLeft: 12 },
  storeName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  storeMeta: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  storeRating: { fontSize: 12, color: '#f5c518', fontWeight: '600', marginLeft: 3 },
  storeDot: { color: 'gray', marginHorizontal: 5, fontSize: 12 },
  storeTime: { fontSize: 12, color: 'gray' },
  tagRow: { flexDirection: 'row', gap: 6 },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontWeight: '500' },

  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 80 },
  emptyEmoji: { fontSize: 56, marginBottom: 12 },
  emptyTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 6 },
  emptySubtitle: { fontSize: 14, textAlign: 'center', paddingHorizontal: 40 },
  hintRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 24, justifyContent: 'center' },
  hintChip: { paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20 },
  hintText: { fontSize: 14, fontWeight: '600' },
});