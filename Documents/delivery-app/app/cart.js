import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, Keyboard, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { addToCart, applyDiscount, clearCart, removeFromCart } from '../store/cartSlice';
import { addOrder } from '../store/ordersSlice';

export default function CartScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { items, totalAmount, discount, appliedCode } = useSelector(state => state.cart);
  const { methods, selectedMethodId } = useSelector(state => state.payment);
  const activeMethod = methods.find(m => m.id === selectedMethodId);

  const [promoInput, setPromoInput] = useState('');

  // --- ЛОГІКА UI (Тут потім буде запит на бекенд) ---
  const handleApplyPromo = () => {
    Keyboard.dismiss();
    const code = promoInput.trim().toUpperCase();

    // ТИМЧАСОВА ПЕРЕВІРКА (Поки немає бекенду)
    // Коли буде бекенд, тут буде запит: const response = await api.checkPromo(code);
    const TEST_CODES = {
        'HELLO': 50,  // Знижка 50 грн
        'SALE': 100   // Знижка 100 грн
    };

    if (TEST_CODES[code]) {
        // Якщо код валідний - диспатчимо математику в Redux
        dispatch(applyDiscount({ code, amount: TEST_CODES[code] }));
        Alert.alert("Успіх", `Промокод ${code} застосовано!`);
        setPromoInput('');
    } else {
        Alert.alert("Помилка", "Невірний промокод (спробуйте HELLO або SALE)");
    }
  };

  const handleCheckout = () => {
    if (items.length === 0) return;

    const finalTotal = Math.max(0, totalAmount - discount);

    const newOrder = {
      id: Date.now().toString(),
      date: new Date().toLocaleString('uk-UA'),
      status: 'Готується 👨‍🍳',
      total: finalTotal,
      discount: discount,
      items: items,
      paymentMethod: activeMethod.type
    };

    dispatch(addOrder(newOrder));
    dispatch(clearCart()); // Очищаємо кошик і знижку

    Alert.alert("Замовлення прийнято! 🎉", `До сплати: ${finalTotal} грн`, [
      { text: "ОК", onPress: () => router.push('/orders') }
    ]);
  };

  if (items.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Ionicons name="cart-outline" size={80} color="gray" />
        <Text style={{ fontSize: 18, color: 'gray', marginTop: 20 }}>Кошик порожній</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Text style={styles.backBtnText}>Повернутися до меню</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const finalPrice = Math.max(0, totalAmount - discount);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.text }]}>Кошик 🛒</Text>
        <TouchableOpacity onPress={() => dispatch(clearCart())}>
             <Text style={{color: 'red'}}>Очистити</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={items}
        keyExtractor={item => item.product_id.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 250 }}
        renderItem={({ item }) => (
          <View style={[styles.itemCard, { backgroundColor: theme.card }]}>
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
              <Text style={{ color: theme.textSecondary }}>{item.price} грн</Text>
            </View>
            <View style={styles.counter}>
              <TouchableOpacity onPress={() => dispatch(removeFromCart(item.product_id))}>
                <Ionicons name="remove-circle" size={28} color="#e334e3" />
              </TouchableOpacity>
              <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}</Text>
              <TouchableOpacity onPress={() => dispatch(addToCart(item))}>
                <Ionicons name="add-circle" size={28} color="#e334e3" />
              </TouchableOpacity>
            </View>
          </View>
        )}
      />

      {/* НИЖНЯ ПАНЕЛЬ */}
      <View style={[styles.footer, { backgroundColor: theme.card }]}>
        
        {/* Ввід промокоду */}
        <Text style={{color: theme.textSecondary, marginBottom: 8, fontSize: 12, fontWeight: 'bold'}}>Є ПРОМОКОД?</Text>
        <View style={[styles.promoContainer, { backgroundColor: theme.input }]}>
            <TextInput 
                style={[styles.promoInput, { color: theme.text }]}
                placeholder="Введіть код"
                placeholderTextColor="gray"
                value={promoInput}
                onChangeText={setPromoInput}
                autoCapitalize="characters"
            />
            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPromo}>
                <Text style={styles.applyBtnText}>ОК</Text>
            </TouchableOpacity>
        </View>

        {/* Якщо знижка є - показуємо її */}
        {appliedCode && (
            <View style={{flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10}}>
                <Text style={{color: '#e334e3'}}>Промокод "{appliedCode}"</Text>
                <Text style={{color: '#e334e3', fontWeight: 'bold'}}>-{discount} грн</Text>
            </View>
        )}

        <View style={styles.divider} />

        {/* Метод оплати */}
        <TouchableOpacity 
            style={[styles.paymentSelector, { backgroundColor: theme.input }]}
            onPress={() => router.push({ pathname: '/payment', params: { returnToCart: 'true' } })}
        >
            <View style={{flexDirection: 'row', alignItems: 'center'}}>
                <View style={[styles.miniIcon, { backgroundColor: activeMethod.color }]}>
                    <Ionicons name={activeMethod.icon} size={16} color="white" />
                </View>
                <Text style={[styles.paymentText, { color: theme.text }]}>{activeMethod.type}</Text>
            </View>
            <Text style={{color: '#e334e3', fontSize: 13, fontWeight: 'bold'}}>Змінити</Text>
        </TouchableOpacity>

        {/* Сума */}
        <View style={styles.totalRow}>
          <Text style={[styles.totalText, { color: theme.text }]}>Разом:</Text>
          <View style={{alignItems: 'flex-end'}}>
             {discount > 0 && (
                 <Text style={{ textDecorationLine: 'line-through', color: 'gray', fontSize: 14 }}>{totalAmount} грн</Text>
             )}
             <Text style={[styles.totalAmount, { color: theme.text }]}>{finalPrice} грн</Text>
          </View>
        </View>
        
        <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
          <Text style={styles.checkoutText}>Оформити замовлення</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { fontSize: 24, fontWeight: 'bold' },
  itemCard: { flexDirection: 'row', alignItems: 'center', marginBottom: 15, padding: 10, borderRadius: 12 },
  image: { width: 60, height: 60, borderRadius: 8 },
  name: { fontSize: 16, fontWeight: 'bold' },
  counter: { flexDirection: 'row', alignItems: 'center' },
  qty: { marginHorizontal: 10, fontSize: 16, fontWeight: 'bold' },
  footer: { padding: 20, borderTopLeftRadius: 24, borderTopRightRadius: 24, elevation: 20, shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 10 },
  promoContainer: { flexDirection: 'row', borderRadius: 12, padding: 5, marginBottom: 15, alignItems: 'center' },
  promoInput: { flex: 1, paddingHorizontal: 10, fontSize: 16 },
  applyBtn: { backgroundColor: '#e334e3', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  applyBtnText: { color: 'white', fontWeight: 'bold' },
  paymentSelector: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 15 },
  miniIcon: { width: 30, height: 20, borderRadius: 4, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  paymentText: { fontWeight: 'bold', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#eee', marginBottom: 15 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, alignItems: 'center' },
  totalText: { fontSize: 18, color: 'gray' },
  totalAmount: { fontSize: 24, fontWeight: 'bold' },
  checkoutBtn: { backgroundColor: '#e334e3', padding: 16, borderRadius: 16, alignItems: 'center' },
  checkoutText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  backBtn: { marginTop: 20, backgroundColor: '#e334e3', padding: 12, borderRadius: 10 },
  backBtnText: { color: 'white', fontWeight: 'bold' }
});