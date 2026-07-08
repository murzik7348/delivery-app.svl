import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState, useMemo } from 'react';
import { Animated, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Alert, FlatList, ActivityIndicator } from 'react-native';
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


const ProductCardItem = ({ product, theme, locale, qty, isFavProd, onSelect, onAddToCart, onRemoveFromCart, onToggleFav }) => {
  const [scaleAnim] = useState(new Animated.Value(1));

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
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
        activeOpacity={0.9}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        onPress={() => onSelect(product)}
        style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: qty === 0 ? 8 : 0 }}
      >
        {/* Фото */}
        <View style={styles.imgWrap}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          {/* Glassmorphism Price Badge */}
          <View style={styles.priceBadgeOverlay}>
            <BlurView intensity={70} tint="dark" style={styles.priceBadgeBlur}>
              <Text style={styles.priceBadgeTextBlur}>{formatPrice(product.price)} ₴</Text>
            </BlurView>
          </View>

          {/* Серце на картинці */}
          <TouchableOpacity
            style={[
              styles.heartBtn,
              { backgroundColor: isFavProd ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.45)' }
            ]}
            onPress={() => {
              Haptics.selectionAsync();
              onToggleFav(product.product_id);
            }}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={isFavProd ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavProd ? '#FF3B30' : 'white'}
            />
          </TouchableOpacity>
        </View>

        {/* Текст */}
        <View style={styles.productInfo}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {product.name}
          </Text>
          {product.description ? (
            <Text style={[styles.productDesc, { color: 'gray' }]} numberOfLines={1}>
              {product.description}
            </Text>
          ) : null}
        </View>
      </TouchableOpacity>

      {/* Кнопки - Повністю поза клікабельною областю картки! */}
      <View style={{ justifyContent: 'center', paddingLeft: 6 }}>
        {qty === 0 ? (
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: theme.primary }]}
            onPress={handleAddToCart}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={16} color="white" style={{ marginRight: 4 }} />
            <Text style={styles.addButtonText}>{t(locale, 'addToCart')}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.counterContainer}>
            <TouchableOpacity
              style={[styles.counterBtn, { backgroundColor: theme.input }]}
              onPress={handleRemoveFromCart}
            >
              <Ionicons name="remove" size={16} color={theme.text} />
            </TouchableOpacity>
            <Text style={[styles.counterText, { color: theme.text }]}>{qty}</Text>
            <TouchableOpacity
              style={[styles.counterBtn, { backgroundColor: theme.primary }]}
              onPress={handleAddToCart}
            >
              <Ionicons name="add" size={16} color="white" />
            </TouchableOpacity>
          </View>
        )}
      </View>
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
      await Promise.all([
        dispatch(fetchCatalog()).unwrap(),
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
    return allCategories.filter(cat => {
      const catId = Number(cat.category_id || cat.id);
      return prodCatIds.has(catId);
    });
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
          {categoriesToRender.map(cat => {
            const isSelected = selectedCategoryId === cat.category_id;
            return (
              <TouchableOpacity
                key={cat.category_id ?? 'all'}
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
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 24,
    padding: 14,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  imgWrap: {
    position: 'relative',
    marginRight: 14,
  },
  productImage: {
    width: 104,
    height: 114,
    borderRadius: 18,
    backgroundColor: '#222',
  },
  priceBadgeOverlay: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    borderRadius: 12,
    overflow: 'hidden',
  },
  priceBadgeBlur: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  priceBadgeTextBlur: {
    color: 'white',
    fontWeight: '900',
    fontSize: 13,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowRadius: 3,
  },
  productInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
    lineHeight: 20,
  },
  productDesc: {
    fontSize: 12,
    marginBottom: 10,
    lineHeight: 16,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  addButtonText: {
    color: 'white',
    fontWeight: '700',
    fontSize: 14,
  },
  counterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  counterBtn: {
    width: 34,
    height: 34,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 11,
  },
  counterText: {
    fontWeight: '800',
    fontSize: 16,
    minWidth: 20,
    textAlign: 'center',
  },
  heartBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
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