import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { products, stores } from '../../data/mockData.js';
import { addToCart, removeFromCart } from '../../store/cartSlice';
// 👇 1. Імпортуємо дію для улюблених
import { toggleFavorite } from '../../store/favoritesSlice';

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useDispatch();
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Дані кошика
  const cartData = useSelector(state => state.cart);
  const cartItems = cartData ? cartData.items : [];
  const totalAmount = cartData ? cartData.totalAmount : 0;

  // 👇 2. Перевіряємо, чи заклад улюблений
  const favoriteIds = useSelector(state => state.favorites.ids);
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
                name={isFavorite ? "star" : "star-outline"} // Якщо лайкнув - повна зірка, ні - пуста
                size={28} 
                color="#FFD700" // Золотий колір
                style={{ marginLeft: 10 }}
              />
            </TouchableOpacity>
          </View>

          <Text style={styles.metaText}>{restaurant.tags.join(' • ')} • {restaurant.delivery_time}</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.text }]}>Меню</Text>
        
        {/* Список товарів */}
        {restaurantProducts.map((product) => {
          const qty = getQty(product.product_id);

          return (
            <View key={product.product_id} style={[styles.productCard, { backgroundColor: theme.card }]}>
              <Image source={{ uri: product.image }} style={styles.productImage} />
              
              <View style={styles.productInfo}>
                <Text style={[styles.productName, { color: theme.text }]}>{product.name}</Text>
                <Text style={[styles.price, { color: theme.text }]}>{product.price} грн</Text>
                
                <View style={{ marginTop: 10 }}>
                  {qty === 0 ? (
                    <TouchableOpacity 
                      style={styles.addButton} 
                      onPress={() => dispatch(addToCart(product))}
                    >
                      <Text style={{color: 'white', fontWeight: 'bold'}}>ДОДАТИ +</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.counterContainer}>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => dispatch(removeFromCart(product.product_id))}>
                        <Text style={{fontSize: 20, fontWeight: 'bold'}}>-</Text>
                      </TouchableOpacity>
                      <Text style={[styles.counterText, { color: theme.text }]}>{qty}</Text>
                      <TouchableOpacity style={styles.counterBtn} onPress={() => dispatch(addToCart(product))}>
                        <Text style={{fontSize: 20, fontWeight: 'bold'}}>+</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

              </View>
            </View>
          );
        })}
      </ScrollView>

      {/* Плаваюча кнопка Кошика */}
      {totalAmount > 0 && (
        <View style={styles.floatingCartContainer}>
          <TouchableOpacity style={styles.viewCartBtn} onPress={() => router.push('/cart')}>
            <Text style={styles.viewCartText}>У кошик: {totalAmount} грн</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  image: { width: '100%', height: 250, resizeMode: 'cover' },
  backButton: { position: 'absolute', top: 50, left: 20, backgroundColor: 'rgba(0,0,0,0.5)', padding: 8, borderRadius: 20 },
  
  infoContainer: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  
  // Стилі для рядка заголовку
  titleRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  title: { fontSize: 28, fontWeight: 'bold' },
  
  metaText: { color: 'gray', fontSize: 14 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 10 },
  
  productCard: { flexDirection: 'row', marginHorizontal: 16, marginBottom: 16, borderRadius: 16, overflow: 'hidden', padding: 10 },
  productImage: { width: 100, height: 100, borderRadius: 10 },
  productInfo: { flex: 1, marginLeft: 10, justifyContent: 'center' },
  productName: { fontSize: 16, fontWeight: 'bold' },
  price: { fontSize: 14, color: 'gray', marginTop: 4 },
  
  addButton: { 
    backgroundColor: '#e334e3', 
    paddingVertical: 8, 
    paddingHorizontal: 12, 
    borderRadius: 8, 
    alignSelf: 'flex-start',
    marginTop: 5
  },
  counterContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 5 },
  counterBtn: { backgroundColor: '#ddd', width: 30, height: 30, justifyContent: 'center', alignItems: 'center', borderRadius: 15 },
  counterText: { marginHorizontal: 10, fontWeight: 'bold', fontSize: 16 },
  
  floatingCartContainer: { position: 'absolute', bottom: 30, width: '100%', paddingHorizontal: 20 },
  viewCartBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center', shadowColor: "#e334e3", shadowOpacity: 0.5, shadowRadius: 10, elevation: 10 },
  viewCartText: { color: 'white', fontWeight: 'bold', fontSize: 18 }
});