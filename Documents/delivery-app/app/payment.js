import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { setPaymentMethod } from '../store/paymentSlice';

export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { returnToCart } = useLocalSearchParams(); // Перевіряємо, чи треба назад у кошик

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const { methods, selectedMethodId } = useSelector(state => state.payment);

  const handleSelect = (id) => {
    dispatch(setPaymentMethod(id));
    
    // Якщо прийшли з кошика — повертаємось
    if (returnToCart === 'true') {
        router.back();
    }
  };

  const handleAddCard = () => {
    Alert.alert("Нова картка", "Функція додавання картки буде доступна пізніше.");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Методи оплати 💳</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Оберіть спосіб оплати</Text>

        {methods.map((card) => {
          const isSelected = selectedMethodId === card.id;
          return (
            <TouchableOpacity 
              key={card.id} 
              style={[
                styles.cardItem, 
                { 
                    backgroundColor: theme.card, 
                    borderColor: isSelected ? '#e334e3' : 'transparent',
                    borderWidth: isSelected ? 2 : 0
                }
              ]}
              onPress={() => handleSelect(card.id)}
            >
              <View style={[styles.iconBox, { backgroundColor: card.color }]}>
                <Ionicons name={card.icon} size={24} color="white" />
              </View>
              
              <View style={styles.cardInfo}>
                <Text style={[styles.cardType, { color: theme.text }]}>{card.type}</Text>
                {card.number ? <Text style={styles.cardNumber}>{card.number}</Text> : null}
              </View>

              <View style={styles.radioBox}>
                  {isSelected ? (
                      <Ionicons name="checkmark-circle" size={28} color="#e334e3" />
                  ) : (
                      <Ionicons name="ellipse-outline" size={28} color={theme.textSecondary} />
                  )}
              </View>
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={handleAddCard}>
            <Ionicons name="add" size={24} color="white" />
            <Text style={styles.addBtnText}>Додати нову картку</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  sectionTitle: { marginBottom: 15, fontSize: 14, textTransform: 'uppercase', fontWeight: 'bold' },
  cardItem: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 12, elevation: 2 },
  iconBox: { width: 50, height: 34, borderRadius: 6, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  cardInfo: { flex: 1 },
  cardType: { fontSize: 16, fontWeight: 'bold' },
  cardNumber: { color: 'gray', marginTop: 2 },
  radioBox: { marginLeft: 10 },
  addBtn: { flexDirection: 'row', backgroundColor: '#e334e3', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  addBtnText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
});