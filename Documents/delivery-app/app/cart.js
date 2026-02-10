import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { clearCart, removeFromCart, updateQuantity } from '../store/cartSlice';
import { addOrder, updateOrderStatus } from '../store/ordersSlice';
import * as Notifications from 'expo-notifications';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  const cartItems = useSelector((state) => state.cart.items);
  const totalPrice = useSelector((state) => state.cart.totalAmount);
  
  // 👇 ГАРАНТОВАНО ОТРИМУЄМО НАЗВУ ОПЛАТИ
  const paymentState = useSelector((state) => state.payment);
  const methods = {
    '1': 'Apple Pay',
    '2': 'Карта',
    '3': 'Готівка',
    'apple': 'Apple Pay',
    'cash': 'Готівка',
    'card': 'Картка'
  };
  // Якщо ID немає в списку, пишемо "Apple Pay" за замовчуванням
  const paymentName = methods[paymentState?.selectedMethodId] || 'Apple Pay';
  
  // Іконка для оплати
  const getPaymentIcon = () => {
    if (paymentName.includes('Apple')) return 'logo-apple';
    if (paymentName.includes('Google')) return 'logo-google';
    if (paymentName.includes('Готівка')) return 'cash';
    return 'card';
  };

  const savedAddresses = useSelector((state) => state.location.savedAddresses);
  const userAddress = savedAddresses && savedAddresses.length > 0 
    ? savedAddresses[0].address 
    : 'Оберіть адресу';

  const [promoCode, setPromoCode] = useState('');

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    const newOrder = {
      id: Date.now().toString(),
      items: cartItems,
      total: totalPrice,
      date: new Date().toISOString(),
      status: 'pending', 
      address: userAddress,
      payment: paymentName
    };

    dispatch(addOrder(newOrder));
    dispatch(clearCart());

    Alert.alert("Успішно!", "Замовлення оформлено 🎉", [{ text: "ОК", onPress: () => router.push('/orders') }]);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Замовлення прийнято! 🛵",
        body: `Кур'єр везе замовлення на: ${userAddress.slice(0, 20)}...`,
        sound: true,
        data: { url: '/orders' },
      },
      trigger: { seconds: 10 },
    });

    setTimeout(() => {
      dispatch(updateOrderStatus({ orderId: newOrder.id, status: 'courier' }));
    }, 10000);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={{ flex: 1, marginLeft: 10 }}>
        <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
        <Text style={{ color: '#e334e3', fontWeight: 'bold', marginTop: 4 }}>{item.price} ₴</Text>
      </View>
      <View style={styles.counter}>
        <TouchableOpacity onPress={() => {
            if (item.quantity > 1) dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }));
            else dispatch(removeFromCart(item.id));
        }}>
           <Ionicons name="remove-circle" size={28} color="#e334e3" />
        </TouchableOpacity>
        <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}</Text>
        <TouchableOpacity onPress={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}>
           <Ionicons name="add-circle" size={28} color="#e334e3" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Кошик 🛒</Text>
        <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <Text style={{ color: 'red', fontWeight: 'bold' }}>Очистити</Text>
        </TouchableOpacity>
      </View>
      
      {cartItems.length > 0 ? (
        <>
          <FlatList 
            data={cartItems} 
            renderItem={renderItem} 
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} 
            contentContainerStyle={{ paddingBottom: 350 }} 
          />
          
          <View style={[styles.footer, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            
            <Text style={[styles.label, { color: theme.textSecondary }]}>Є ПРОМОКОД?</Text>
            <View style={[styles.rowContainer, { backgroundColor: theme.input }]}>
                <TextInput 
                    style={[styles.input, { color: theme.text }]} 
                    placeholder="Введіть код" 
                    placeholderTextColor="gray"
                    value={promoCode}
                    onChangeText={setPromoCode}
                />
                <TouchableOpacity style={styles.applyBtn}>
                    <Text style={styles.applyBtnText}>OK</Text>
                </TouchableOpacity>
            </View>
            
            <View style={[styles.divider, { backgroundColor: theme.border }]} />

            {/* 📍 АДРЕСА */}
            <TouchableOpacity 
              style={[styles.rowContainer, { backgroundColor: theme.input, paddingVertical: 12 }]} 
              onPress={() => router.push('/location-picker')}
            >
              <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                  {/* 👇 КРУЖЕЧОК ЯК НА СКРІНІ */}
                  <View style={styles.iconCircle}>
                      <Ionicons name="location" size={18} color="#e334e3" />
                  </View>
                  <View style={{marginLeft: 10, flex: 1}}>
                    <Text style={{color: 'gray', fontSize: 10}}>Адреса доставки:</Text>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }} numberOfLines={1}>
                        {userAddress}
                    </Text>
                  </View>
              </View>
              <Text style={styles.changeText}>Змінити</Text>
            </TouchableOpacity>

            {/* 💳 ОПЛАТА */}
            <TouchableOpacity 
              style={[styles.rowContainer, { backgroundColor: theme.input, paddingVertical: 12, marginTop: 10 }]} 
              onPress={() => router.push('/payment')}
            >
               <View style={{flexDirection: 'row', alignItems: 'center', flex: 1}}>
                  <View style={styles.iconCircle}>
                      <Ionicons name={getPaymentIcon()} size={18} color={theme.text} />
                  </View>
                  <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 10 }}>{paymentName}</Text>
              </View>
              <Text style={styles.changeText}>Змінити</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, marginBottom: 15 }}>
               <Text style={{ fontSize: 18, color: theme.text }}>Разом:</Text>
               <Text style={{ fontSize: 24, fontWeight: 'bold', color: theme.text }}>{totalPrice} грн</Text>
            </View>

            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutText}>Оформити замовлення</Text>
            </TouchableOpacity>
          </View>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold' },
  
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, padding: 12, borderRadius: 16, marginHorizontal: 16 },
  image: { width: 60, height: 60, borderRadius: 8 },
  name: { fontSize: 16, fontWeight: 'bold' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  qty: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 20, 
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    elevation: 20, shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: {width: 0, height: -5}
  },
  
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 5, textTransform: 'uppercase' },
  
  rowContainer: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderRadius: 12, paddingHorizontal: 15, paddingVertical: 5 
  },

  // 👇 НОВИЙ СТИЛЬ ДЛЯ ІКОНКИ В КРУЖЕЧКУ
  iconCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: 'white', // Білий фон
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#eee'
  },
  
  input: { flex: 1, height: 44, fontSize: 16 },
  applyBtn: { backgroundColor: '#e334e3', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  applyBtnText: { color: 'white', fontWeight: 'bold' },
  
  changeText: { color: '#e334e3', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, marginVertical: 15 },
  
  checkoutBtn: { backgroundColor: '#e334e3', padding: 18, borderRadius: 16, alignItems: 'center' },
  checkoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 10 },
  shopBtnText: { fontWeight: 'bold' }
});