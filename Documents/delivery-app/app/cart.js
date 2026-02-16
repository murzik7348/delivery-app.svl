import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef, useEffect } from 'react';
import { 
  Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, 
  useColorScheme, LayoutAnimation, Platform, UIManager, Modal, PanResponder, Animated 
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { clearCart, removeFromCart, updateQuantity, setDeliveryType, setOrderNote, addToCart } from '../store/cartSlice';
import { addOrder } from '../store/ordersSlice';
import AddressBottomSheet from '../components/AddressBottomSheet';
import { products } from '../data/mockData'; 

// Вмикаємо анімацію Layout для Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [isAddressSheetVisible, setAddressSheetVisible] = useState(false);
  const [isNoteVisible, setIsNoteVisible] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);

  // --- АНІМАЦІЯ ШТОРКИ (DRAG) ---
  const [bodyHeight, setBodyHeight] = useState(0); 
  const pan = useRef(new Animated.Value(0)).current; 

  const panResponder = useRef(
    PanResponder.create({
      // Починаємо перехоплювати дотик, якщо посунули хоча б на 5 пікселів
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      
      onPanResponderGrant: () => {
        // Фіксуємо поточне положення, щоб рух був плавним з місця зупинки
        pan.setOffset(pan._value);
        pan.setValue(0);
      },
      
      onPanResponderMove: (_, gestureState) => {
        let newY = gestureState.dy;
        const currentTotal = pan._offset + newY;

        // Легкий опір тільки якщо тягнемо за межі дозволеного (гумовий ефект)
        if (currentTotal < 0) {
            newY = newY * 0.4; // Тягнемо вгору більше ніж треба - важко
        } else if (currentTotal > bodyHeight) {
            newY = newY * 0.4; // Тягнемо вниз більше ніж треба - важко
        }
        
        // В межах норми (0 ... bodyHeight) - рухається 1 в 1 за пальцем
        pan.setValue(newY); 
      },
      
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset(); // Зливаємо зсув
        
        const velocity = gestureState.vy; // Швидкість (плюс - вниз, мінус - вгору)
        const currentY = pan._value;      // Де зараз шторка (0 - верх, bodyHeight - низ)
        
        let toValue = 0; // За замовчуванням відкриваємо (0)

        // ЛОГІКА РІШЕННЯ:
        // 1. Якщо швидко кинули вниз (velocity > 0.3) -> ЗАКРИТИ
        // 2. Якщо повільно тягнули, але перетнули половину шляху -> ЗАКРИТИ
        if (velocity > 0.3 || (velocity >= 0 && currentY > bodyHeight * 0.4)) {
            toValue = bodyHeight;
        } 
        // В усіх інших випадках -> ВІДКРИТИ (повернути вгору)
        else {
            toValue = 0;
        }

        // Анімація польоту
        Animated.spring(pan, {
          toValue: toValue,
          useNativeDriver: false,
          friction: 6,       // Тертя (чим менше, тим слизькіше)
          tension: 60,       // Натяг пружини (швидкість повернення)
          overshootClamping: true // Щоб не вилітало за межі
        }).start();
      },
    })
  ).current;

  // Початкове закриття шторки (коли виміряли висоту)
  useEffect(() => {
    if (bodyHeight > 0) {
      pan.setValue(bodyHeight);
    }
  }, [bodyHeight]);


  // --- REDUX ДАНІ ---
  const { 
    items: cartItems, subtotal, totalAmount, discountAmount, 
    appliedPromo, deliveryType, deliveryFee, orderNote 
  } = useSelector((state) => state.cart);
  
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const paymentId = useSelector((state) => state.payment?.selectedMethodId);
  const savedAddresses = useSelector((state) => state.location.savedAddresses);
  const userAddress = savedAddresses && savedAddresses.length > 0 ? savedAddresses[0].address : 'Оберіть адресу';
  
  const getPaymentInfo = (id) => {
    const map = { '1': { name: 'Apple Pay', icon: 'logo-apple' }, '2': { name: 'Google Pay', icon: 'logo-google' }, '3': { name: 'Готівка', icon: 'cash' }, 'card': { name: 'Картка', icon: 'card' } };
    return map[id] || { name: 'Apple Pay', icon: 'logo-apple' };
  };
  const paymentInfo = getPaymentInfo(paymentId);
  
  const recommendations = products.filter(p => !cartItems.find(i => (i.id || i.product_id) === p.product_id)).slice(0, 5);

  const handleAddToCartFromSheet = () => {
    if (viewProduct) {
      dispatch(addToCart({ ...viewProduct, quantity: 1 }));
      setViewProduct(null);
    }
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      Alert.alert("Вхід не виконано", "Увійдіть у профіль.", [{ text: "Відміна", style: "cancel" }, { text: "Увійти", onPress: () => router.push('/(auth)/login') }]);
      return;
    }
    const newOrder = {
      id: Date.now().toString(),
      items: cartItems,
      total: totalAmount,
      discount: discountAmount,
      delivery: deliveryFee,
      promo: appliedPromo?.code || null,
      note: orderNote,
      type: deliveryType,
      date: new Date().toISOString(),
      status: 'pending', 
      address: deliveryType === 'delivery' ? userAddress : 'Самовивіз з ресторану',
      payment: paymentInfo.name
    };
    dispatch(addOrder(newOrder));
    dispatch(clearCart());
    Alert.alert("Успішно!", `Замовлення оформлено 🎉`, [{ text: "ОК", onPress: () => router.push('/orders') }]);
  };

  const renderItem = ({ item }) => {
    const itemId = item.id || item.product_id;
    return (
      <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
        <TouchableOpacity style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} activeOpacity={0.7} onPress={() => setViewProduct(item)}>
          <Image source={{ uri: item.image }} style={styles.image} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.name, { color: theme.text }]} numberOfLines={2}>{item.name}</Text>
            <Text style={{ color: '#e334e3', fontWeight: 'bold', marginTop: 4 }}>{item.price} ₴</Text>
          </View>
        </TouchableOpacity>
        <View style={styles.counter}>
          <TouchableOpacity onPress={() => { if (item.quantity > 1) dispatch(updateQuantity({ id: itemId, quantity: item.quantity - 1 })); else dispatch(removeFromCart(itemId)); }}>
             <Ionicons name="remove-circle" size={32} color="#e334e3" />
          </TouchableOpacity>
          <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}</Text>
          <TouchableOpacity onPress={() => dispatch(updateQuantity({ id: itemId, quantity: item.quantity + 1 }))}>
             <Ionicons name="add-circle" size={32} color="#e334e3" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Header */}
      <View style={styles.headerContainer}>
        <View style={styles.headerTitleRow}>
          <Text style={[styles.title, { color: theme.text }]}>Кошик</Text>
          <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <Text style={{ color: '#ff3b30', fontWeight: '600' }}>Очистити</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.toggleContainer, { backgroundColor: theme.input }]}>
          <TouchableOpacity style={[styles.toggleBtn, deliveryType === 'delivery' && styles.toggleBtnActive]} onPress={() => dispatch(setDeliveryType('delivery'))}>
            <Text style={[styles.toggleText, deliveryType === 'delivery' && styles.toggleTextActive]}>🛵 Доставка</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.toggleBtn, deliveryType === 'pickup' && styles.toggleBtnActive]} onPress={() => dispatch(setDeliveryType('pickup'))}>
            <Text style={[styles.toggleText, deliveryType === 'pickup' && styles.toggleTextActive]}>🏃 Самовивіз</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {cartItems.length > 0 ? (
        <>
          <FlatList 
            data={cartItems} 
            renderItem={renderItem} 
            keyExtractor={(item, index) => (item.id || item.product_id || index).toString()} 
            contentContainerStyle={{ paddingBottom: 350, paddingTop: 10 }} 
            ListFooterComponent={
              <View style={styles.recommendationsContainer}>
                <Text style={[styles.recTitle, { color: theme.text }]}>З цим смакує 🔥</Text>
                <FlatList
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  data={recommendations}
                  keyExtractor={item => (item.product_id || item.id).toString()}
                  renderItem={({ item }) => (
                    <TouchableOpacity style={[styles.recCard, { backgroundColor: theme.card }]} activeOpacity={0.8} onPress={() => setViewProduct(item)}>
                      <Image source={{ uri: item.image }} style={styles.recImage} />
                      <View style={{ alignItems: 'center' }}>
                         <Text style={[styles.recName, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                         <Text style={{ color: '#e334e3', fontWeight: 'bold', fontSize: 12 }}>{item.price} ₴</Text>
                      </View>
                      <View style={styles.recAddBtn}><Ionicons name="add" size={20} color="white" /></View>
                    </TouchableOpacity>
                  )}
                />
              </View>
            }
          />
          
          {/* --- ІНТЕРАКТИВНА ШТОРКА (SMOOTH) --- */}
          <Animated.View 
            style={[
              styles.footer, 
              { backgroundColor: theme.card, shadowColor: theme.text },
              { 
                transform: [{ 
                  translateY: pan.interpolate({
                    inputRange: [0, bodyHeight], 
                    outputRange: [0, bodyHeight], 
                    extrapolate: 'clamp' // Жорсткий фіксатор візуально
                  }) 
                }] 
              }
            ]}
          >
            {/* Обгортка для жестів */}
            <View {...panResponder.panHandlers}>
                
                {/* 1. ВЕРХНЯ ЧАСТИНА */}
                <View style={styles.visibleHeader}>
                  <View style={styles.collapseHandle}>
                    <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2 }} />
                  </View>
                  
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
                     <Text style={{ fontSize: 18, fontWeight: 'bold', color: theme.text }}>До сплати:</Text>
                     <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{totalAmount} ₴</Text>
                  </View>

                  <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
                    <Text style={styles.checkoutText}>Оформити замовлення</Text>
                  </TouchableOpacity>
                </View>

                {/* 2. ПРИХОВАНА ЧАСТИНА */}
                <View 
                  onLayout={(event) => {
                    const { height } = event.nativeEvent.layout;
                    // Оновлюємо висоту, тільки якщо вона реально змінилась
                    if(height > 0 && Math.abs(bodyHeight - height) > 1) {
                        setBodyHeight(height);
                    }
                  }}
                  style={styles.hiddenBody}
                >
                  <View style={[styles.divider, { backgroundColor: theme.border }]} />
                  
                  {/* Деталі ціни */}
                  <View style={styles.priceRow}>
                    <Text style={{ color: 'gray' }}>Товари</Text>
                    <Text style={{ color: theme.text }}>{subtotal} ₴</Text>
                  </View>
                  {deliveryType === 'delivery' && (
                    <View style={styles.priceRow}>
                      <Text style={{ color: 'gray' }}>Доставка</Text>
                      <Text style={{ color: theme.text }}>{deliveryFee === 0 ? 'Безкоштовно' : `${deliveryFee} ₴`}</Text>
                    </View>
                  )}
                  {appliedPromo && (
                    <View style={styles.priceRow}>
                      <Text style={{ color: '#e334e3' }}>Знижка</Text>
                      <Text style={{ color: '#e334e3' }}>- {discountAmount} ₴</Text>
                    </View>
                  )}

                  <View style={{ height: 20 }} />

                  {/* Опції */}
                  <TouchableOpacity style={[styles.actionRow, { backgroundColor: theme.input }]} onPress={() => router.push('/promocodes')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name="ticket-outline" size={20} color="#e334e3" /><Text style={[styles.actionText, { color: theme.text }]}>{appliedPromo ? appliedPromo.code : 'Промокод'}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color="gray" />
                  </TouchableOpacity>

                  {deliveryType === 'delivery' && (
                    <TouchableOpacity style={[styles.actionRow, { backgroundColor: theme.input }]} onPress={() => setAddressSheetVisible(true)}>
                      <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}><Ionicons name="location-outline" size={20} color={theme.text} /><Text style={[styles.actionText, { color: theme.text }]} numberOfLines={1}>{userAddress}</Text></View>
                      <Text style={{color: '#e334e3', fontSize: 12}}>Змінити</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity style={[styles.actionRow, { backgroundColor: theme.input }]} onPress={() => router.push('/payment')}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}><Ionicons name={paymentInfo.icon} size={20} color={theme.text} /><Text style={[styles.actionText, { color: theme.text }]}>{paymentInfo.name}</Text></View>
                    <Ionicons name="chevron-forward" size={18} color="gray" />
                  </TouchableOpacity>

                  {/* Нотатка */}
                  <View style={{ marginTop: 10, paddingBottom: 20 }}>
                    {!isNoteVisible && !orderNote ? (
                      <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsNoteVisible(true); }}>
                          <Text style={{ color: '#e334e3', fontWeight: 'bold', padding: 5 }}>+ Коментар до замовлення</Text>
                      </TouchableOpacity>
                    ) : (
                      <View style={[styles.noteContainer, { backgroundColor: theme.input }]}>
                        <TextInput style={[styles.noteInput, { color: theme.text }]} placeholder="Код домофону, прибори..." placeholderTextColor="gray" value={orderNote} onChangeText={(text) => dispatch(setOrderNote(text))} multiline />
                      </View>
                    )}
                  </View>
                </View>

            </View>
          </Animated.View>

        </>
      ) : (
        <View style={styles.emptyContainer}>
          <Ionicons name="cart-outline" size={80} color="gray" />
          <Text style={[styles.emptyText, { color: theme.text }]}>Кошик порожній</Text>
          <TouchableOpacity style={[styles.shopBtn, { backgroundColor: theme.card }]} onPress={() => router.push('/(tabs)')}>
            <Text style={[styles.shopBtnText, { color: theme.text }]}>В меню</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ШТОРКА ТОВАРУ */}
      <Modal animationType="slide" transparent={true} visible={!!viewProduct} onRequestClose={() => setViewProduct(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setViewProduct(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.productSheet, { backgroundColor: theme.card }]}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginVertical: 10 }} />
            {viewProduct && (
              <>
                <Image source={{ uri: viewProduct.image }} style={styles.sheetImage} />
                <View style={styles.sheetContent}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <Text style={[styles.sheetTitle, { color: theme.text, flex: 1 }]}>{viewProduct.name}</Text>
                    <Text style={styles.sheetPrice}>{viewProduct.price} ₴</Text>
                  </View>
                  <Text style={[styles.sheetDesc, { color: theme.textSecondary }]}>{viewProduct.description || 'Опис відсутній.'}</Text>
                  <TouchableOpacity style={styles.sheetBtn} onPress={() => {
                        const itemId = viewProduct.id || viewProduct.product_id;
                        const isInCart = cartItems.find(i => (i.id || i.product_id) === itemId);
                        if (!isInCart) handleAddToCartFromSheet();
                        else setViewProduct(null);
                    }}>
                    <Text style={styles.sheetBtnText}>{cartItems.find(i => (i.id || i.product_id) === (viewProduct.id || viewProduct.product_id)) ? 'Зрозуміло' : 'Додати в кошик'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <AddressBottomSheet visible={isAddressSheetVisible} onClose={() => setAddressSheetVisible(false)} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 10 },
  headerTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 28, fontWeight: 'bold' },
  toggleContainer: { flexDirection: 'row', borderRadius: 12, padding: 4, height: 44 },
  toggleBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleBtnActive: { backgroundColor: 'white', shadowColor: '#000', shadowOpacity: 0.1, elevation: 2 },
  toggleText: { fontWeight: '600', color: 'gray' },
  toggleTextActive: { color: 'black' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 12, padding: 12, borderRadius: 20, marginHorizontal: 16 }, 
  image: { width: 65, height: 65, borderRadius: 16, backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold', lineHeight: 22 },
  counter: { flexDirection: 'row', alignItems: 'center' },
  qty: { marginHorizontal: 12, fontSize: 18, fontWeight: 'bold' },
  recommendationsContainer: { marginTop: 20, paddingLeft: 16, marginBottom: 20 },
  recTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 12 },
  recCard: { width: 140, marginRight: 15, borderRadius: 16, padding: 10, alignItems: 'center', elevation: 2 },
  recImage: { width: 100, height: 80, borderRadius: 12, marginBottom: 8, backgroundColor: '#eee' },
  recName: { fontSize: 13, fontWeight: '600', textAlign: 'center', marginBottom: 4 },
  recAddBtn: { position: 'absolute', bottom: 8, right: 8, backgroundColor: '#e334e3', borderRadius: 15, width: 26, height: 26, justifyContent: 'center', alignItems: 'center' },

  // --- FOOTER Styles ---
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    elevation: 20, shadowOpacity: 0.15, shadowRadius: 10, shadowOffset: {width: 0, height: -5},
    paddingHorizontal: 20,
    paddingTop: 10,
    zIndex: 100,
  },
  visibleHeader: {
    paddingBottom: 20,
  },
  hiddenBody: {},
  collapseHandle: { alignItems: 'center', paddingVertical: 10, width: '100%' },
  
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  divider: { height: 1, marginVertical: 12, opacity: 0.5 },
  actionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderRadius: 12, marginBottom: 8 },
  actionText: { fontSize: 14, fontWeight: '600', marginLeft: 10, flex: 1 },
  noteContainer: { borderRadius: 12, padding: 10 },
  noteInput: { fontSize: 14, maxHeight: 60 },
  checkoutBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center', width: '100%' },
  checkoutText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 },
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  productSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, width: '100%', maxHeight: '80%' },
  sheetImage: { width: '100%', height: 250, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  sheetContent: { padding: 20 },
  sheetTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  sheetPrice: { fontSize: 24, fontWeight: 'bold', color: '#e334e3' },
  sheetDesc: { fontSize: 16, marginTop: 10, marginBottom: 25, lineHeight: 24 },
  sheetBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center' },
  sheetBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});