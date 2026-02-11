import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import Colors from '../constants/Colors';

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const order = useSelector((state) => 
    state.orders.orders.find((o) => o.id === id)
  );

  if (!order) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>Замовлення не знайдено</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: 'white' }}>Назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Логіка статусів
  let currentStep = 1; 
  if (order.status === 'courier') currentStep = 2;
  if (order.status === 'completed') currentStep = 3;

  const steps = [
    { title: "Прийнято", icon: "checkmark-circle", time: "10:00" },
    { title: "Готується 👨‍🍳", icon: "flame", time: "10:05" },
    { title: "Кур'єр їде 🛵", icon: "bicycle", time: "10:20" },
    { title: "Доставлено 🎉", icon: "home", time: "10:45" },
  ];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Замовлення #{order.id.slice(-4)}</Text>
        <View style={{width: 24}} />
      </View>

      {/* ГОЛОВНИЙ СПИСОК (БЕЗ SCROLLVIEW!) */}
      <FlatList
        data={order.items}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        
        // 1. ВЕРХНЯ ЧАСТИНА (Кур'єр + Статуси)
        ListHeaderComponent={
          <>
            {/* Кур'єр */}
            <View style={[styles.card, { backgroundColor: theme.card }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Image 
                        source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                        style={styles.avatar} 
                    />
                    <View style={{marginLeft: 15}}>
                        <Text style={[styles.name, { color: theme.text }]}>Олександр</Text>
                        <Text style={{color: 'gray', fontSize: 12}}>Ваш кур'єр • ⭐ 4.9</Text>
                    </View>
                </View>
                <TouchableOpacity onPress={() => Alert.alert("Дзвінок", "Телефонуємо...")} style={styles.callBtn}>
                    <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Статуси */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Статус доставки</Text>
            <View style={[styles.card, { backgroundColor: theme.card, paddingVertical: 20 }]}>
                {steps.map((step, index) => {
                    const isActive = index <= currentStep;
                    return (
                        <View key={index} style={styles.stepRow}>
                            <View style={{ alignItems: 'center', marginRight: 15 }}>
                                <View style={[styles.circle, { backgroundColor: isActive ? '#e334e3' : theme.input }]}>
                                    <Ionicons name={step.icon} size={16} color={isActive ? 'white' : 'gray'} />
                                </View>
                                {index !== steps.length - 1 && (
                                    <View style={[styles.line, { backgroundColor: isActive ? '#e334e3' : theme.input }]} />
                                )}
                            </View>
                            <View>
                                <Text style={{ color: isActive ? theme.text : 'gray', fontWeight: isActive ? 'bold' : 'normal', fontSize: 16 }}>{step.title}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Товари</Text>
          </>
        }

        // 2. СПИСОК ТОВАРІВ (renderItem)
        renderItem={({ item }) => (
          <View style={[styles.itemRow, { borderBottomColor: theme.border }]}>
            <Text style={{ fontWeight: 'bold', marginRight: 10, color: theme.text }}>{item.quantity}x</Text>
            <Text style={{ flex: 1, color: theme.text, fontSize: 16 }}>{item.name}</Text>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.price * item.quantity} ₴</Text>
          </View>
        )}

        // 3. НИЖНЯ ЧАСТИНА (Підсумок)
        ListFooterComponent={
           <View style={[styles.card, { backgroundColor: theme.card, marginTop: 20 }]}>
              <View style={styles.infoRow}>
                  <Text style={{color: 'gray'}}>Дата:</Text>
                  <Text style={{color: theme.text, fontWeight: 'bold'}}>
                    {new Date(order.date).toLocaleString('uk-UA')}
                  </Text>
              </View>
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
              <View style={styles.infoRow}>
                  <Text style={{color: 'gray'}}>Сума:</Text>
                  <Text style={{color: '#e334e3', fontWeight: 'bold', fontSize: 24}}>{order.total} ₴</Text>
              </View>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: '#e334e3', padding: 10, borderRadius: 8 },
  
  card: { padding: 16, borderRadius: 16, marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  name: { fontSize: 18, fontWeight: 'bold' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center' },
  
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  
  stepRow: { flexDirection: 'row', height: 60 }, // Фіксована висота для ліній
  circle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  line: { width: 2, height: '100%', position: 'absolute', top: 30, left: 14 },
  
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});