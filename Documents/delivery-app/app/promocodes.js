import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../constants/Colors';
import { applyDiscount } from '../store/cartSlice';

export default function PromocodesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [code, setCode] = useState('');

  // Список доступних промокодів
  const promos = [
    { id: '1', code: 'SALE10', discount: '-10%', desc: 'На все замовлення', color: '#FF6B6B' },
    { id: '2', code: 'BURGER50', discount: '-50₴', desc: 'Знижка на бургери', color: '#4ECDC4' },
    { id: '3', code: 'FREEFOOD', discount: '🛵 0₴', desc: 'Безкоштовна доставка', color: '#e334e3' },
  ];

  const handleApplyPromo = () => {
    Keyboard.dismiss();
    if (code.trim() === '') return;
    
    // Шукаємо введений код у нашому списку
    const foundPromo = promos.find(p => p.code === code.trim().toUpperCase());
    
    if (foundPromo) {
       // Розпізнаємо знижку (відсотки чи фіксована сума)
       let type = 'percent';
       let discountValue = 0;

       if (foundPromo.discount.includes('%')) {
           type = 'percent';
           // Витягуємо тільки цифри
           discountValue = parseInt(foundPromo.discount.replace(/\D/g, ''), 10);
       } else {
           type = 'fixed';
           discountValue = parseInt(foundPromo.discount.replace(/\D/g, ''), 10);
       }
       
       // Відправляємо в Redux
       dispatch(applyDiscount({ 
         code: foundPromo.code, 
         type, 
         discount: discountValue 
       }));

       Alert.alert("Успіх! 🎉", `Промокод "${foundPromo.code}" застосовано!`);
       setCode('');
       router.back(); // Повертаємось у кошик
    } else {
       Alert.alert("Помилка", "Такого промокоду не існує");
    }
  };

  // Клік по картці вставляє код у поле
  const copyToClipboard = (promoCode) => {
    setCode(promoCode);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Шапка */}
      <View style={[styles.header, { backgroundColor: theme.card }]}>
        <TouchableOpacity onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: theme.input }]}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Промокоди</Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.content}>
        
        {/* Поле вводу */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Додати промокод</Text>
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="ticket-outline" size={20} color={theme.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder="Введіть код..."
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
            />
          </View>
          <TouchableOpacity style={styles.applyBtn} onPress={handleApplyPromo} activeOpacity={0.8}>
            <Text style={styles.applyBtnText}>Застосувати</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* Список доступних промокодів */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Доступні для вас</Text>

        <FlatList
          data={promos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: 20 }}
          renderItem={({ item }) => (
            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={() => copyToClipboard(item.code)}
              style={styles.ticketContainer}
            >
              {/* Ліва частина (Знижка) */}
              <View style={[styles.ticketLeft, { backgroundColor: item.color }]}>
                <Text style={styles.discountText}>{item.discount}</Text>
                {/* Декоративні кола */}
                <View style={[styles.circleTop, { backgroundColor: theme.background }]} />
                <View style={[styles.circleBottom, { backgroundColor: theme.background }]} />
              </View>

              {/* Права частина (Опис) */}
              <View style={[styles.ticketRight, { backgroundColor: theme.card }]}>
                <View>
                    <Text style={[styles.promoCode, { color: theme.text }]}>{item.code}</Text>
                    <Text style={[styles.promoDesc, { color: theme.textSecondary }]}>{item.desc}</Text>
                </View>
                <Ionicons name="copy-outline" size={20} color={theme.textSecondary} />
              </View>
            </TouchableOpacity>
          )}
        />

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  backBtn: { padding: 8, borderRadius: 20 },
  headerTitle: { fontSize: 18, fontWeight: 'bold' },
  content: { padding: 16, flex: 1 },
  
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },

  // Ввід
  inputRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  inputWrapper: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 50, borderRadius: 12, borderWidth: 1, paddingHorizontal: 12, marginRight: 10 },
  inputIcon: { marginRight: 8 },
  input: { flex: 1, fontSize: 16 },
  applyBtn: { backgroundColor: '#e334e3', height: 50, paddingHorizontal: 20, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 15 },

  divider: { height: 1, marginVertical: 10, marginBottom: 20 },

  // СТИЛІ КВИТКА
  ticketContainer: { flexDirection: 'row', height: 100, marginBottom: 15, borderRadius: 16, overflow: 'hidden', elevation: 3 },
  
  ticketLeft: { width: 100, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  discountText: { color: 'white', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  
  circleTop: { position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: 10 },
  circleBottom: { position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: 10 },

  ticketRight: { flex: 1, padding: 15, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' },
  promoCode: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  promoDesc: { fontSize: 12 },
});