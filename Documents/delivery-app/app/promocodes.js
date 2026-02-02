import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

export default function PromocodesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [code, setCode] = useState('');
  
  // Фейкові промокоди
  const [promos, setPromos] = useState([
    { id: '1', code: 'HELLO2024', discount: '-20%', desc: 'На перше замовлення', color: '#FF6B6B' },
    { id: '2', code: 'BURGER50', discount: '-50%', desc: 'Знижка на бургери', color: '#4ECDC4' },
    { id: '3', code: 'FREEDELIVERY', discount: '🛵 0₴', desc: 'Безкоштовна доставка', color: '#e334e3' },
  ]);

  const handleAddPromo = () => {
    if (code.trim() === '') return;
    Alert.alert("Успіх", `Промокод "${code}" додано!`);
    setCode('');
  };

  const copyToClipboard = (promoCode) => {
    // Тут в реальному додатку було б Clipboard.setString(promoCode)
    Alert.alert("Скопійовано! 📋", `Використайте код ${promoCode} в кошику.`);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Мої промокоди 🎟</Text>
        <View style={{width: 24}} />
      </View>

      <View style={styles.content}>
        
        {/* Поле вводу */}
        <View style={[styles.inputContainer, { backgroundColor: theme.card }]}>
          <TextInput 
            style={[styles.input, { color: theme.text }]}
            placeholder="Введіть промокод"
            placeholderTextColor={theme.textSecondary}
            value={code}
            onChangeText={setCode}
          />
          <TouchableOpacity style={styles.addBtn} onPress={handleAddPromo}>
            <Text style={styles.addBtnText}>Додати</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>Активні купони</Text>

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
                <View style={styles.circleTop} />
                <View style={styles.circleBottom} />
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 5 },
  
  content: { padding: 20, flex: 1 },

  inputContainer: { flexDirection: 'row', padding: 5, borderRadius: 16, marginBottom: 30, elevation: 2 },
  input: { flex: 1, paddingHorizontal: 15, fontSize: 16 },
  addBtn: { backgroundColor: '#e334e3', borderRadius: 12, paddingHorizontal: 20, justifyContent: 'center', alignItems: 'center' },
  addBtnText: { color: 'white', fontWeight: 'bold' },

  subtitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 15 },

  // СТИЛІ КВИТКА (TICKET)
  ticketContainer: { flexDirection: 'row', height: 100, marginBottom: 15, borderRadius: 16, overflow: 'hidden', elevation: 3 },
  
  ticketLeft: { width: 100, justifyContent: 'center', alignItems: 'center', position: 'relative' },
  discountText: { color: 'white', fontSize: 24, fontWeight: '900' },
  
  // Вирізи для ефекту квитка
  circleTop: { position: 'absolute', top: -10, right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f2f2f2' }, // Колір фону екрану (підбираємо під світлу тему)
  circleBottom: { position: 'absolute', bottom: -10, right: -10, width: 20, height: 20, borderRadius: 10, backgroundColor: '#f2f2f2' },

  ticketRight: { flex: 1, padding: 15, justifyContent: 'space-between', flexDirection: 'row', alignItems: 'center' },
  promoCode: { fontSize: 18, fontWeight: 'bold', marginBottom: 4 },
  promoDesc: { fontSize: 12 },
});