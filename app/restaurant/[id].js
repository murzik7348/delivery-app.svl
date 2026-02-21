import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { t } from '../../constants/translations';
import { products, stores } from '../../data/mockData.js';
import { addToCart, removeFromCart } from '../../store/cartSlice';
import { toggleFavorite, toggleFavoriteProduct } from '../../store/favoritesSlice';
import ProductSheet from '../../components/ProductSheet';

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
  const [selectedProduct, setSelectedProduct] = useState(null);

  const isFavorite = favoriteIds.includes(Number(id));

  const restaurant = stores.find(s => s.store_id == id);
  const restaurantProducts = products.filter(p => p.store_id == id);

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
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
            <TouchableOpacity
              key={product.product_id}
              style={[styles.productCard, { backgroundColor: theme.card }]}
              activeOpacity={0.82}
              onPress={() => setSelectedProduct(product)}
            >
              {/* Фото */}
              <View style={styles.imgWrap}>
                <Image source={{ uri: product.image }} style={styles.productImage} />
                {/* Бейдж ціни поверх фото */}
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeText}>{product.price} ₴</Text>
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
                      onPress={() => dispatch(addToCart(product))}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="add" size={16} color="white" style={{ marginRight: 4 }} />
                      <Text style={styles.addButtonText}>{t(locale, 'addToCart')}</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.counterContainer}>
                      <TouchableOpacity
                        style={[styles.counterBtn, { backgroundColor: theme.input }]}
                        onPress={() => dispatch(removeFromCart(product.product_id))}
                      >
                        <Ionicons name="remove" size={16} color={theme.text} />
                      </TouchableOpacity>
                      <Text style={[styles.counterText, { color: theme.text }]}>{qty}</Text>
                      <TouchableOpacity
                        style={[styles.counterBtn, { backgroundColor: '#e334e3' }]}
                        onPress={() => dispatch(addToCart(product))}
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
                onPress={() => dispatch(toggleFavoriteProduct(product.product_id))}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={isFavProd ? 'heart' : 'heart-outline'}
                  size={20}
                  color={isFavProd ? '#e334e3' : 'gray'}
                />
              </TouchableOpacity>

            </TouchableOpacity>
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
    marginBottom: 14,
    borderRadius: 20,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  imgWrap: {
    position: 'relative',
    marginRight: 12,
  },
  productImage: {
    width: 100,
    height: 110,
    borderRadius: 14,
    backgroundColor: '#222',
  },
  priceBadge: {
    position: 'absolute',
    bottom: 6,
    left: 6,
    backgroundColor: '#e334e3',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  priceBadgeText: {
    color: 'white',
    fontWeight: '800',
    fontSize: 12,
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