import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { 
  Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View, 
  useColorScheme, Platform, UIManager, Modal, Animated, PanResponder, TextInput, Dimensions, LayoutAnimation, KeyboardAvoidingView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { clearCart, removeFromCart, updateQuantity, setDeliveryType, setOrderNote, addToCart } from '../store/cartSlice';
import { addOrder } from '../store/ordersSlice';

import AddressBottomSheet from '../components/AddressBottomSheet';
import { products } from '../data/mockData.js'; 

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CLOSED_HEIGHT = 120; // Висота згорнутої шторки
const OPEN_HEIGHT = SCREEN_HEIGHT * 0.75; // Висота відкритої

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const [isAddressSheetVisible, setAddressSheetVisible] = useState(false);
  const [viewProduct, setViewProduct] = useState(null);
  const [isNoteVisible, setIsNoteVisible] = useState(false);

  // --- REDUX ДАНІ ---
  const { 
    items: cartItems, totalAmount, discountAmount, 
    appliedPromo, deliveryType, deliveryFee, orderNote 
  } = useSelector((state) => state.cart);

  // --- ЗАЛІЗНА МАТЕМАТИКА (БЕЗ NaN) ---
  const safeTotal = parseFloat(totalAmount) || 0;
  const safeDelivery = deliveryType === 'delivery' ? (parseFloat(deliveryFee) || 0) : 0;
  const safeDiscount = parseFloat(discountAmount) || 0;
  const calculatedSubtotal = safeTotal - safeDelivery + safeDiscount;
  
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

  // --- АНІМАЦІЯ ШТОРКИ (ВБУДОВАНА) ---
  const maxOffset = OPEN_HEIGHT - CLOSED_HEIGHT;
  const panY = useRef(new Animated.Value(maxOffset)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => panY.extractOffset(),
      onPanResponderMove: (_, gestureState) => panY.setValue(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.moveY < SCREEN_HEIGHT - 200)) {
          Animated.spring(panY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: false }).start();
        } else {
          Animated.spring(panY, { toValue: maxOffset, friction: 6, tension: 50, useNativeDriver: false }).start();
        }
      },
    })
  ).current;

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
      total: safeTotal,
      discount: safeDiscount,
      delivery: safeDelivery,
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
      
      {/* HEADER */}
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
          {/* СПИСОК ТОВАРІВ */}
          <FlatList 
            data={cartItems} 
            renderItem={renderItem} 
            keyExtractor={(item, index) => (item.id || item.product_id || index).toString()} 
            contentContainerStyle={{ paddingBottom: 160, paddingTop: 10 }} 
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
          
          {/* 👇 НИЖНЯ ШТОРКА (ВБУДОВАНА, БАЧИТЬ ВСІ ДАНІ І ФУНКЦІЇ) 👇 */}
          <Animated.View
            style={[
              styles.sheetContainer,
              {
                height: OPEN_HEIGHT,
                transform: [{
                  translateY: panY.interpolate({
                    inputRange: [-200, 0, maxOffset, maxOffset + 200],
                    outputRange: [-50, 0, maxOffset, maxOffset + 50],
                    extrapolate: 'clamp',
                  }),
                }],
              },
            ]}
          >
            {/* Зона для свайпу */}
            <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
              <View style={styles.dragIndicator} />
            </View>

            <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.sheetContent}>
              
              <View style={styles.sheetHeaderRow}>
                <Text style={styles.totalLabel}>До сплати:</Text>
                <Text style={styles.totalPrice}>{safeTotal} ₴</Text>
              </View>

              <TouchableOpacity style={styles.orderButton} onPress={handleCheckout} activeOpacity={0.8}>
                <Text style={styles.orderButtonText}>Оформити замовлення</Text>
              </TouchableOpacity>

              <View style={styles.detailsContainer}>
                 <View style={styles.divider} />
                 
                 <View style={styles.detailRow}>
                   <Text style={styles.detailText}>Товари</Text>
                   <Text style={styles.detailPrice}>{calculatedSubtotal} ₴</Text>
                 </View>

                 {deliveryType === 'delivery' && (
                   <View style={styles.detailRow}>
                     <Text style={styles.detailText}>Доставка</Text>
                     <Text style={styles.detailPrice}>{safeDelivery === 0 ? 'Безкоштовно' : `${safeDelivery} ₴`}</Text>
                   </View>
                 )}

                 {safeDiscount > 0 && (
                   <View style={styles.detailRow}>
                     <Text style={{ color: '#e334e3', fontSize: 16 }}>Знижка</Text>
                     <Text style={{ color: '#e334e3', fontSize: 16 }}>- {safeDiscount} ₴</Text>
                   </View>
                 )}

                 {/* КНОПКИ ПЕРЕХОДІВ */}
                 <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/promocodes')} activeOpacity={0.7}>
                   <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                      <Ionicons name="ticket-outline" size={24} color="#e334e3" />
                      <Text style={styles.menuText}>{appliedPromo ? appliedPromo.code : 'Промокод'}</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={20} color="gray" />
                 </TouchableOpacity>

                 {deliveryType === 'delivery' && (
                   <TouchableOpacity style={styles.menuItem} onPress={() => setAddressSheetVisible(true)} activeOpacity={0.7}>
                     <View style={{flexDirection:'row', alignItems:'center', gap: 10, flex: 1}}>
                        <Ionicons name="location-outline" size={24} color="white" />
                        <Text style={styles.menuText} numberOfLines={1}>{userAddress}</Text>
                     </View>
                     <Text style={{color: '#e334e3', fontSize: 12}}>Змінити</Text>
                   </TouchableOpacity>
                 )}

                 <TouchableOpacity style={styles.menuItem} onPress={() => router.push('/payment')} activeOpacity={0.7}>
                   <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                      <Ionicons name={paymentInfo.icon} size={24} color="white" />
                      <Text style={styles.menuText}>{paymentInfo.name}</Text>
                   </View>
                   <Ionicons name="chevron-forward" size={20} color="gray" />
                 </TouchableOpacity>
                 
                 {/* КОМЕНТАР */}
                 <View style={{ marginTop: 15, paddingBottom: 20 }}>
                   {!isNoteVisible && !orderNote ? (
                     <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsNoteVisible(true); }}>
                         <Text style={{ color: '#e334e3', fontWeight: 'bold' }}>+ Коментар до замовлення</Text>
                     </TouchableOpacity>
                   ) : (
                     <View style={styles.noteContainer}>
                       <TextInput 
                         style={styles.noteInput} 
                         placeholder="Код домофону, прибори..." 
                         placeholderTextColor="gray" 
                         value={orderNote} 
                         onChangeText={(text) => dispatch(setOrderNote(text))} 
                         multiline 
                       />
                     </View>
                   )}
                 </View>
              </View>
            </KeyboardAvoidingView>
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

      {/* ШТОРКА ТОВАРУ (Modal) */}
      <Modal animationType="slide" transparent={true} visible={!!viewProduct} onRequestClose={() => setViewProduct(null)}>
        <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setViewProduct(null)}>
          <TouchableOpacity activeOpacity={1} style={[styles.productSheet, { backgroundColor: theme.card }]}>
            <View style={{ width: 40, height: 4, backgroundColor: '#ccc', borderRadius: 2, alignSelf: 'center', marginVertical: 10 }} />
            {viewProduct && (
              <>
                <Image source={{ uri: viewProduct.image }} style={styles.sheetImage} />
                <View style={styles.productSheetContent}>
                  <View style={{flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start'}}>
                    <Text style={[styles.productSheetTitle, { color: theme.text, flex: 1 }]}>{viewProduct.name}</Text>
                    <Text style={styles.productSheetPrice}>{viewProduct.price} ₴</Text>
                  </View>
                  <Text style={[styles.productSheetDesc, { color: theme.textSecondary }]}>{viewProduct.description || 'Опис відсутній.'}</Text>
                  <TouchableOpacity style={styles.productSheetBtn} onPress={() => {
                        const itemId = viewProduct.id || viewProduct.product_id;
                        const isInCart = cartItems.find(i => (i.id || i.product_id) === itemId);
                        if (!isInCart) handleAddToCartFromSheet();
                        else setViewProduct(null);
                    }}>
                    <Text style={styles.productSheetBtnText}>{cartItems.find(i => (i.id || i.product_id) === (viewProduct.id || viewProduct.product_id)) ? 'Зрозуміло' : 'Додати в кошик'}</Text>
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
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 },

  // --- СТИЛІ ВБУДОВАНОЇ ШТОРКИ КОШИКА ---
  sheetContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 20, zIndex: 999,
  },
  dragHandleArea: { width: '100%', height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  dragIndicator: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2 },
  sheetContent: { paddingHorizontal: 20, flex: 1 },
  sheetHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  totalPrice: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  orderButton: { backgroundColor: '#d946ef', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  orderButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  detailsContainer: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailText: { color: 'gray', fontSize: 16 },
  detailPrice: { color: 'white', fontSize: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c2c2e', padding: 15, borderRadius: 12, marginTop: 10 },
  menuText: { color: 'white', fontSize: 16, fontWeight:'500' },
  noteContainer: { backgroundColor: '#2c2c2e', borderRadius: 12, padding: 10 },
  noteInput: { color: 'white', fontSize: 14, maxHeight: 60 },

  // --- СТИЛІ МОДАЛКИ ТОВАРУ ---
  modalOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.5)' },
  productSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingBottom: 40, width: '100%', maxHeight: '80%' },
  sheetImage: { width: '100%', height: 250, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  productSheetContent: { padding: 20 },
  productSheetTitle: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  productSheetPrice: { fontSize: 24, fontWeight: 'bold', color: '#e334e3' },
  productSheetDesc: { fontSize: 16, marginTop: 10, marginBottom: 25, lineHeight: 24 },
  productSheetBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center' },
  productSheetBtnText: { color: 'white', fontSize: 16, fontWeight: 'bold' }
});