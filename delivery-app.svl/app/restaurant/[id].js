import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Animated, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Alert, FlatList, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { t } from '../../constants/translations';
import { tryAddToCart, removeFromCart, decrementItem, formatPrice } from '../../store/cartSlice';
import { toggleFavorite, toggleFavoriteProduct } from '../../store/favoritesSlice';
import { fetchCatalog, fetchRestaurantProducts } from '../../store/catalogSlice';
import ProductSheet from '../../components/ProductSheet';
import { safeBack } from '../../utils/navigation';
import BackButton from '../../components/BackButton';
import { isRestaurantClosed } from '../../utils/dateUtils';


const formatWeight = (product) => {
  const w = product?.weightGrams ?? product?.weight_grams ?? product?.weight ?? product?.averageWeight;
  if (!w) return null;
  const num = parseInt(w, 10);
  if (!isNaN(num) && num > 0) {
    return `${num} г`;
  }
  if (typeof w === 'string' && w.trim().length > 0) {
    const trimmed = w.trim();
    return trimmed.includes('г') || trimmed.includes('мл') || trimmed.includes('g') ? trimmed : `${trimmed} г`;
  }
  return null;
};

const ProductCardItem = ({ product, theme, locale, qty, isFavProd, onSelect, onAddToCart, onRemoveFromCart, onToggleFav }) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  const weightText = formatWeight(product);

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.97, useNativeDriver: true }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, friction: 4, tension: 40, useNativeDriver: true }).start();

  const handleAddToCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onAddToCart(product);
  };

  const handleRemoveFromCart = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onRemoveFromCart(product.product_id);
  };

  return (
    <Animated.View style={[styles.productCard, { backgroundColor: theme.card, transform: [{ scale: scaleAnim }] }]}>
      <TouchableOpacity
        activeOpacity={0.85}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onSelect(product)}
        style={styles.cardTouchArea}
      >
        {/* Ліва частина: Фото з кнопкою улюбленого */}
        <View style={styles.imgWrap}>
          <Image 
            source={{ uri: product.image }} 
            style={styles.productImage} 
            contentFit="cover" 
            priority="medium"
            cachePolicy="memory-disk"
          />

          {/* Кнопка улюбленого (сердечко) */}
          <TouchableOpacity
            style={[
              styles.heartBtn,
              { backgroundColor: isFavProd ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.45)' }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onToggleFav(product.product_id);
            }}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name={isFavProd ? 'heart' : 'heart-outline'}
              size={16}
              color={isFavProd ? '#FF3B30' : 'white'}
            />
          </TouchableOpacity>
        </View>

        {/* Права частина: Інформація про страву, ціна, грамаж та кнопка */}
        <View style={styles.productInfo}>
          <View>
            <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
              {product.name}
            </Text>
            {product.description ? (
              <Text style={[styles.productDesc, { color: theme.textSecondary || 'gray' }]} numberOfLines={2}>
                {product.description}
              </Text>
            ) : null}
          </View>

          {/* Нижній рядок: Ціна (чорна/біла) + Грамаж зліва, Кнопка додавання справа */}
          <View style={styles.bottomRow}>
            <View style={styles.priceContainer}>
              <Text style={[styles.productPrice, { color: theme.text }]}>
                {formatPrice(product.price)} ₴
              </Text>
              {weightText ? (
                <Text style={[styles.productWeight, { color: theme.textSecondary || '#8E8E93' }]}>
                  {weightText}
                </Text>
              ) : null}
            </View>

            {qty === 0 ? (
              <TouchableOpacity
                style={[styles.addCircleBtn, { backgroundColor: theme.primary }]}
                onPress={handleAddToCart}
                activeOpacity={0.8}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="add" size={20} color="white" />
              </TouchableOpacity>
            ) : (
              <View style={[styles.counterPill, { backgroundColor: theme.card, borderColor: theme.primary }]}>
                <TouchableOpacity
                  style={styles.counterActionBtn}
                  onPress={handleRemoveFromCart}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="remove" size={14} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.counterQtyText, { color: theme.text }]}>{qty}</Text>
                <TouchableOpacity
                  style={[styles.counterActionBtn, { backgroundColor: theme.primary }]}
                  onPress={handleAddToCart}
                  hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                >
                  <Ionicons name="add" size={14} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const cartData = useSelector(state => state.cart);
  const cartItems = cartData ? cartData.items : [];
  const cartSubtotal = cartData ? cartData.subtotal : 0;
  const favoriteIds = useSelector(state => state.favorites.ids);
  const favoriteProductIds = useSelector(state => state.favorites.productIds ?? []);
  const stores = useSelector(state => state.catalog.stores);
  const products = useSelector(state => state.catalog.products);
  const isLoading = useSelector(state => state.catalog.isLoading);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh both full catalog (for restaurant info) and specific products
      // Pass forceRefresh: true to bypass 5-min cache condition
      await Promise.all([
        dispatch(fetchCatalog({ forceRefresh: true })).unwrap(),
        dispatch(fetchRestaurantProducts(Number(id))).unwrap()
      ]);
    } catch (error) {
      console.error('Refresh restaurant failed:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const isFavorite = favoriteIds.includes(Number(id));

  useEffect(() => {
    if (id) {
      dispatch(fetchRestaurantProducts(Number(id)));
    }
  }, [id, dispatch]);

  const restaurant = useMemo(() => stores.find(s => Number(s.store_id) === Number(id)), [stores, id]);
  const isClosed = useMemo(() => isRestaurantClosed(restaurant), [restaurant]);

  const restaurantProducts = useMemo(() => {
    const targetId = Number(id);
    return products.filter(p => {
      const pStoreId = Number(p.restaurantId || p.store_id);
      return pStoreId === targetId;
    });
  }, [products, id]);

  const allCategories = useSelector(state => state.catalog.categories);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);

  const restaurantCategories = useMemo(() => {
    const prodCatIds = new Set(restaurantProducts.map(p => Number(p.category_id)));
    const categories = [];
    prodCatIds.forEach(catId => {
      let found = allCategories.find(c => Number(c.category_id || c.id) === catId);
      if (found) {
        categories.push(found);
      } else {
        // Якщо категорію було відфільтровано (бо це була заглушка), створюємо дефолтну,
        // щоб товари в цій категорії не зникли з меню ресторану.
        categories.push({ category_id: catId, name: 'Меню', sticker: '🍽️' });
      }
    });
    return categories;
  }, [allCategories, restaurantProducts]);

  const categoriesToRender = useMemo(() => [
    { category_id: null, name: locale === 'uk' ? 'Усі' : 'All', sticker: '🍽️' },
    ...restaurantCategories.map(c => ({
      category_id: c.category_id || c.id,
      name: c.name,
      sticker: c.sticker || '🍽️'
    }))
  ], [restaurantCategories, locale]);

  const filteredProducts = useMemo(() => {
    if (!selectedCategoryId) return restaurantProducts;
    return restaurantProducts.filter(p => Number(p.category_id) === Number(selectedCategoryId));
  }, [restaurantProducts, selectedCategoryId]);

  const flatData = useMemo(() => {
    const list = [];
    restaurantCategories.forEach((cat, index) => {
      const catId = cat.category_id || cat.id;
      const catProducts = filteredProducts.filter(p => Number(p.category_id) === Number(catId));
      if (catProducts.length === 0) return;

      list.push({
        type: 'header',
        id: `header-${catId}`,
        catId,
        catName: cat.name,
        catSticker: cat.sticker || '🍽️',
        showDivider: selectedCategoryId === null && index > 0,
      });

      catProducts.forEach(product => {
        list.push({
          type: 'product',
          id: product.product_id,
          product,
        });
      });
    });
    return list;
  }, [restaurantCategories, filteredProducts, selectedCategoryId]);

  const getQty = (prodId) => {
    const item = cartItems.find(i => i.product_id === prodId);
    return item ? item.quantity : 0;
  };

  if (!restaurant) return null;

  const renderHeader = () => (
    <View style={{ backgroundColor: theme.background }}>
      {/* Картинка */}
      <View style={{ position: 'relative' }}>
        <Image source={{ uri: restaurant.image }} style={styles.image} />
        {isClosed && (
          <View style={styles.closedOverlayDetail}>
            <View style={styles.closedTextBgDetail}>
              <Ionicons name="lock-closed" size={20} color="white" style={{ marginRight: 6 }} />
              <Text style={styles.closedTextDetail}>Наразі ресторан зачинений</Text>
            </View>
          </View>
        )}
        <View style={styles.backButton}>
          <BackButton color="white" />
        </View>
      </View>

      {/* Інформація про заклад */}
      <View style={[styles.infoContainer, { backgroundColor: theme.background }]}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: theme.text, flex: 1 }]}>{restaurant.name}</Text>
          <TouchableOpacity onPress={() => dispatch(toggleFavorite(Number(id)))}>
            <Ionicons
              name={isFavorite ? "star" : "star-outline"}
              size={28}
              color="#FFD700"
              style={{ marginLeft: 10 }}
            />
          </TouchableOpacity>
        </View>
        <Text style={styles.metaText}>{restaurant.delivery_time}</Text>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>{t(locale, 'restaurantMenu')}</Text>

      {/* Горизонтальний повзунок категорій */}
      {restaurantCategories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesContainer}
          style={styles.categoriesScroll}
        >
          {categoriesToRender.map((cat, index) => {
            const isSelected = selectedCategoryId === cat.category_id;
            const uniqueKey = cat.category_id !== null && cat.category_id !== undefined ? `cat-${cat.category_id}` : `cat-all-${index}`;
            return (
              <TouchableOpacity
                key={uniqueKey}
                style={[
                  styles.categoryBtn,
                  { backgroundColor: isSelected ? theme.primary : theme.card }
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedCategoryId(cat.category_id);
                }}
              >
                <Text style={styles.categorySticker}>{cat.sticker}</Text>
                <Text
                  style={[
                    styles.categoryBtnText,
                    { color: isSelected ? 'white' : theme.text }
                  ]}
                >
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}

      {/* Стан завантаження */}
      {isLoading && restaurantProducts.length === 0 ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={{ color: 'gray', marginTop: 10 }}>{t(locale, 'loading') || 'Завантаження...'}</Text>
        </View>
      ) : null}

      {filteredProducts.length === 0 && !isLoading ? (
        <View style={{ padding: 40, alignItems: 'center' }}>
          <Ionicons name="fast-food-outline" size={48} color="gray" />
          <Text style={{ color: 'gray', marginTop: 10 }}>{t(locale, 'noProducts') || 'Товарів не знайдено'}</Text>
        </View>
      ) : null}
    </View>
  );

  const renderItem = ({ item }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.categorySection}>
          {item.showDivider && (
            <View style={[styles.categoryDivider, { backgroundColor: theme.input }]} />
          )}
          <View style={styles.categoryHeaderRow}>
            <Text style={styles.categoryHeaderSticker}>{item.catSticker}</Text>
            <Text style={[styles.categoryHeaderTitle, { color: theme.text }]}>
              {item.catName}
            </Text>
          </View>
        </View>
      );
    }

    const product = item.product;
    const qty = getQty(product.product_id);
    const isFavProd = favoriteProductIds.includes(product.product_id);

    return (
      <ProductCardItem
        product={product}
        theme={theme}
        locale={locale}
        qty={qty}
        isFavProd={isFavProd}
        onSelect={setSelectedProduct}
        onAddToCart={(p) => {
          if (isClosed) {
            Alert.alert(
              'Ресторан зачинено',
              'Цей ресторан наразі зачинений і не приймає замовлень.'
            );
            return;
          }
          dispatch(tryAddToCart(p));
        }}
        onRemoveFromCart={(productId) => {
          const itemInCart = cartItems.find(i => i.product_id === productId);
          if (itemInCart) {
            if (itemInCart.quantity > 1) {
              dispatch(decrementItem(itemInCart.cartKey));
            } else {
              dispatch(removeFromCart(productId));
            }
          }
        }}
        onToggleFav={(id) => dispatch(toggleFavoriteProduct(id))}
      />
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <FlatList
        data={flatData}
        renderItem={renderItem}
        keyExtractor={item => item.id.toString()}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        initialNumToRender={6}
        maxToRenderPerBatch={8}
        windowSize={5}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      />


      {/* Плаваюча кнопка Кошика */}
      {cartSubtotal > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity style={[styles.viewCartBtn, { backgroundColor: theme.primary, shadowColor: theme.primary }]} onPress={() => router.push('/cart')}>
            <Text style={styles.viewCartText}>{locale === 'en' ? 'To cart:' : 'У кошик:'} {formatPrice(cartSubtotal)} {locale === 'en' ? 'UAH' : 'грн'}</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedProduct && (
        <ProductSheet
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  image: { width: '100%', height: 250, resizeMode: 'cover' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },

  infoContainer: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 28, fontWeight: 'bold' },

  metaText: { color: 'gray', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 10 },

  productCard: {
    marginHorizontal: 16,
    marginBottom: 14,
    borderRadius: 20,
    overflow: 'visible',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardTouchArea: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    minHeight: 124,
  },
  imgWrap: {
    position: 'relative',
    width: 104,
    height: 104,
    marginRight: 14,
  },
  productImage: {
    width: 104,
    height: 104,
    borderRadius: 16,
    backgroundColor: '#222',
  },
  productInfo: {
    flex: 1,
    justifyContent: 'space-between',
    minHeight: 104,
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 21,
  },
  productDesc: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 6,
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 'auto',
    paddingTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    flexShrink: 1,
    marginRight: 8,
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  productWeight: {
    fontSize: 13,
    fontWeight: '600',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  counterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    borderWidth: 1.5,
    padding: 2,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  counterActionBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  counterQtyText: {
    fontWeight: '800',
    fontSize: 14,
    paddingHorizontal: 6,
    textAlign: 'center',
  },

  floatingCartContainer: { position: 'absolute', bottom: 30, width: '100%', paddingHorizontal: 20 },
  viewCartBtn: { backgroundColor: '#000000', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: '#000000', shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  viewCartText: { color: 'white', fontWeight: 'bold', fontSize: 18 },

  closedOverlayDetail: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 2,
  },
  closedTextBgDetail: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  closedTextDetail: {
    color: 'white',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
  categoriesScroll: {
    marginBottom: 16,
  },
  categoriesContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  categoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  categorySticker: {
    fontSize: 16,
    marginRight: 6,
  },
  categoryBtnText: {
    fontSize: 14,
    fontWeight: '700',
  },
  categorySection: {
    marginBottom: 20,
  },
  categoryHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 10,
    marginBottom: 12,
  },
  categoryHeaderSticker: {
    fontSize: 22,
    marginRight: 8,
  },
  categoryHeaderTitle: {
    fontSize: 20,
    fontWeight: '800',
    letterSpacing: -0.2,
    textTransform: 'uppercase',
  },
  categoryDivider: {
    height: 1,
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 25,
  },
});