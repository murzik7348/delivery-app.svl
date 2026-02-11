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

// 👇 ІМПОРТУЄМО ШТОРКУ (Перевір, що файл існує в папці components)
import AddressBottomSheet from '../components/AddressBottomSheet';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // Стан для відкриття шторки
  const [isAddressSheetVisible, setAddressSheetVisible] = useState(false);

  const cartItems = useSelector((state) => state.cart.items);
  const totalPrice = useSelector((state) => state.cart.totalAmount);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated || state.auth.token);

  // Оплата
  const paymentId = useSelector((state) => state.payment?.selectedMethodId);
  const getPaymentInfo = (id) => {
    const map = {
      '1': { name: 'Apple Pay', icon: 'logo-apple' },
      'apple': { name: 'Apple Pay', icon: 'logo-apple' },
      '2': { name: 'Google Pay', icon: 'logo-google' },
      'card': { name: 'Картка', icon: 'card' },
      '3': { name: 'Готівка', icon: 'cash' },
      'cash': { name: 'Готівка', icon: 'cash' }
    };
    return map[id] || { name: 'Apple Pay', icon: 'logo-apple' };
  };
  const paymentInfo = getPaymentInfo(paymentId);

  // Адреса
  const savedAddresses = useSelector((state) => state.location.savedAddresses);
  const userAddress = savedAddresses && savedAddresses.length > 0 
    ? savedAddresses[0].address 
    : 'Оберіть адресу';

  const [promoCode, setPromoCode] = useState('');

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    if (!isAuthenticated) {
      Alert.alert("Вхід не виконано", "Увійдіть у профіль.", [
        { text: "Відміна", style: "cancel" },
        { text: "Увійти", onPress: () => router.push('/(auth)/login') }
      ]);
      return;
    }

    const newOrder = {
      id: Date.now().toString(),
      items: cartItems,
      total: totalPrice,
      date: new Date().toISOString(),
      status: 'pending', 
      address: userAddress,
      payment: paymentInfo.name
    };

    dispatch(addOrder(newOrder));
    dispatch(clearCart());

    Alert.alert("Успішно!", "Замовлення оформлено 🎉", [{ text: "ОК", onPress: () => router.push('/orders') }]);

    setTimeout(async () => {
      dispatch(updateOrderStatus({ orderId: newOrder.id, status: 'courier' }));
      await Notifications.scheduleNotificationAsync({
        content: {
          title: "Замовлення прийнято! 🛵",
          body: `Кур'єр вже везе ваше замовлення #${newOrder.id.slice(-4)}`,
          sound: true, data: { url: '/orders' },
        },
        trigger: null,
      });
    }, 10000);
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
      <Image source={{ uri: item.image }} style={styles.image} />
      <View style={{ flex: 1, marginLeft: 12 }}>
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
            <Text style={{ color: '#ff3b30', fontWeight: 'bold' }}>Очистити</Text>
        </TouchableOpacity>
      </View>
      
      {cartItems.length > 0 ? (
        <>
          <FlatList 
            data={cartItems} 
            renderItem={renderItem} 
            keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()} 
            contentContainerStyle={{ paddingBottom: 380 }} 
          />
          
          <View style={[styles.footer, { backgroundColor: theme.card, shadowColor: theme.text }]}>
            
            <Text style={[styles.label, { color: theme.textSecondary }]}>Є ПРОМОКОД?</Text>
            <View style={[styles.promoRow, { backgroundColor: theme.input }]}>
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

            {/* 👇 АДРЕСА: ТЕПЕР ВІДКРИВАЄ ШТОРКУ, А НЕ КАРТУ */}
            <TouchableOpacity 
              style={[styles.infoRow, { backgroundColor: theme.input }]} 
              onPress={() => setAddressSheetVisible(true)} // 👈 ВІДКРИВАЄМО ШТОРКУ
            >
              <View style={styles.leftSide}>
                  <Ionicons name="location" size={20} color={theme.text} />
                  <View style={{ marginLeft: 10, flex: 1 }}>
                    <Text style={{color: 'gray', fontSize: 10}}>Адреса доставки:</Text>
                    <Text style={{ color: theme.text, fontWeight: 'bold' }} numberOfLines={1}>
                        {userAddress}
                    </Text>
                  </View>
              </View>
              <Text style={styles.changeText}>Змінити</Text>
            </TouchableOpacity>

            {/* ОПЛАТА */}
            <TouchableOpacity 
              style={[styles.infoRow, { backgroundColor: theme.input, marginTop: 10 }]} 
              onPress={() => router.push('/payment')}
            >
               <View style={styles.leftSide}>
                  <Ionicons name={paymentInfo.icon} size={20} color={theme.text} />
                  <Text style={{ color: theme.text, fontWeight: 'bold', marginLeft: 10 }}>
                    {paymentInfo.name}
                  </Text>
              </View>
              <Text style={styles.changeText}>Змінити</Text>
            </TouchableOpacity>

            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 24, marginBottom: 16 }}>
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

      {/* 👇 ТУТ ЖИВЕ ШТОРКА. ВОНА НЕВИДИМА, ПОКИ ТИ НЕ НАЖМЕШ "ЗМІНИТИ" */}
      <AddressBottomSheet 
        visible={isAddressSheetVisible} 
        onClose={() => setAddressSheetVisible(false)} 
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 28, fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, padding: 12, borderRadius: 16, marginHorizontal: 16 },
  image: { width: 60, height: 60, borderRadius: 12, backgroundColor: '#eee' },
  name: { fontSize: 16, fontWeight: 'bold', flex: 1 },
  counter: { flexDirection: 'row', alignItems: 'center' },
  qty: { marginHorizontal: 12, fontSize: 16, fontWeight: 'bold' },
  footer: { 
    position: 'absolute', bottom: 0, left: 0, right: 0, 
    padding: 24, borderTopLeftRadius: 30, borderTopRightRadius: 30,
    elevation: 25, shadowOpacity: 0.3, shadowRadius: 15, shadowOffset: {width: 0, height: -5}
  },
  label: { fontSize: 12, fontWeight: 'bold', marginBottom: 8, textTransform: 'uppercase' },
  promoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 12, paddingVertical: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  leftSide: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  input: { flex: 1, height: 40, fontSize: 16 },
  applyBtn: { backgroundColor: '#e334e3', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8 },
  applyBtnText: { color: 'white', fontWeight: 'bold' },
  changeText: { color: '#e334e3', fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, marginVertical: 20, opacity: 0.5 },
  checkoutBtn: { backgroundColor: '#e334e3', padding: 18, borderRadius: 16, alignItems: 'center' },
  checkoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: -50 },
  emptyText: { fontSize: 18, marginTop: 16, marginBottom: 20 },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  shopBtnText: { fontWeight: 'bold', fontSize: 16 }
});