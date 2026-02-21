import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { addCard, removeCard, setPaymentMethod } from '../store/paymentSlice';
import CardFormSheet from '../components/CardFormSheet';

export default function PaymentScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { returnToCart } = useLocalSearchParams();
  const [showCardForm, setShowCardForm] = useState(false);

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');

  const { methods, selectedMethodId } = useSelector(state => state.payment);

  const handleSelect = (id) => {
    dispatch(setPaymentMethod(id));
    if (returnToCart === 'true') router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'paymentTitle')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t(locale, 'choosePayment')}</Text>

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

              {/* Видалити (тільки для доданих карток, не дефолтних) */}
              {!['1', '2', '3'].includes(card.id) && (
                <TouchableOpacity
                  style={styles.deleteBtn}
                  onPress={() => dispatch(removeCard(card.id))}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="trash-outline" size={16} color="#e74c3c" />
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={styles.addBtn} onPress={() => setShowCardForm(true)}>
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addBtnText}>{t(locale, 'addNewCard')}</Text>
        </TouchableOpacity>

      </ScrollView>

      {showCardForm && (
        <CardFormSheet
          onClose={() => setShowCardForm(false)}
          onSave={(card) => {
            dispatch(addCard(card));
            setShowCardForm(false);
          }}
        />
      )}
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
  deleteBtn: { padding: 6, marginLeft: 6 },
});