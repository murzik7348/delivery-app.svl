import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Animated, Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { t } from '../../constants/translations';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import { toggleFavorite, toggleFavoriteProduct } from '../../store/favoritesSlice';
import ProductSheet from '../../components/ProductSheet';
import { safeBack } from '../../utils/navigation';

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
    <TouchableOpacity
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onSelect(product)}
    >
      <Animated.View style={[styles.productCard, { backgroundColor: theme.card, transform: [{ scale: scaleAnim }] }]}>
        {/* Фото */}
        <View style={styles.imgWrap}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          {/* Glassmorphism Price Badge */}
          <View style={styles.priceBadgeOverlay}>
            <BlurView intensity={70} tint="dark" style={styles.priceBadgeBlur}>
              <Text style={styles.priceBadgeTextBlur}>{product.price} ₴</Text>
            </BlurView>
          </View>
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

          {/* Кнопки */}
          <View style={styles.actions}>
            {qty === 0 ? (
              <TouchableOpacity
                style={styles.addButton}
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
                  style={[styles.counterBtn, { backgroundColor: '#e334e3' }]}
                  onPress={handleAddToCart}
                >
                  <Ionicons name="add" size={16} color="white" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Серце */}
        <TouchableOpacity
          style={[styles.heartBtn, { backgroundColor: isFavProd ? '#e334e322' : theme.input }]}
          onPress={() => {
            Haptics.selectionAsync();
            onToggleFav(product.product_id);
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons
            name={isFavProd ? 'heart' : 'heart-outline'}
            size={20}
            color={isFavProd ? '#e334e3' : 'gray'}
          />
        </TouchableOpacity>
      </Animated.View>
    </TouchableOpacity>
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
  const totalAmount = cartData ? cartData.totalAmount : 0;
  const favoriteIds = useSelector(state => state.favorites.ids);
  const favoriteProductIds = useSelector(state => state.favorites.productIds ?? []);
  const stores = useSelector(state => state.catalog.stores);
  const products = useSelector(state => state.catalog.products);
  const [selectedProduct, setSelectedProduct] = useState(null);

  const isFavorite = favoriteIds.includes(Number(id));

  const restaurant = stores.find(s => s.store_id == id);
  const restaurantProducts = products.filter(p => (p.restaurantId == id || p.store_id == id));

  const getQty = (prodId) => {
    const item = cartItems.find(i => i.product_id === prodId);
    return item ? item.quantity : 0;
  };

  if (!restaurant) return null;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle="light-content" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Картинка */}
        <View>
          <Image source={{ uri: restaurant.image }} style={styles.image} />
          <TouchableOpacity style={styles.backButton} onPress={() => safeBack(router)}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
        </View>

        {/* Інформація про заклад */}
        <View style={[styles.infoContainer, { backgroundColor: theme.background }]}>

          {/* 👇 3. Рядок з Назвою і Зірочкою (Те, що ти просив) */}
          <View style={styles.titleRow}>
            <Text style={[styles.title, { color: theme.text }]}>{restaurant.name}</Text>

            <TouchableOpacity onPress={() => dispatch(toggleFavorite(Number(id)))}>
              <Ionicons
                name={isFavorite ? "star" : "star-outline"}
                size={28}
                color="#FFD700"
                style={{ marginLeft: 10 }}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.metaText}>{restaurant.tags.join(' • ')} • {restaurant.delivery_time}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t(locale, 'restaurantMenu')}</Text>

        {/* Список товарів */}
        {restaurantProducts.map((product) => {
          const qty = getQty(product.product_id);
          const isFavProd = favoriteProductIds.includes(product.product_id);

          return (
            <ProductCardItem
              key={product.product_id}
              product={product}
              theme={theme}
              locale={locale}
              qty={qty}
              isFavProd={isFavProd}
              onSelect={setSelectedProduct}
              onAddToCart={(p) => dispatch(addToCart(p))}
              onRemoveFromCart={(id) => dispatch(removeFromCart(id))}
              onToggleFav={(id) => dispatch(toggleFavoriteProduct(id))}
            />
          );
        })}
      </ScrollView>


      {/* Плаваюча кнопка Кошика */}
      {totalAmount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity style={styles.viewCartBtn} onPress={() => router.push('/cart')}>
            <Text style={styles.viewCartText}>{locale === 'en' ? 'To cart:' : 'У кошик:'} {totalAmount} {locale === 'en' ? 'UAH' : 'грн'}</Text>
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
    backgroundColor: '#e334e3',
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
    width: 36,
    height: 36,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },

  floatingCartContainer: { position: 'absolute', bottom: 30, width: '100%', paddingHorizontal: 20 },
  viewCartBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: "#e334e3", shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  viewCartText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});