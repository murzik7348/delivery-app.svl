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

  // 👇 МАГІЯ: Знаходимо замовлення в пам'яті телефону (Redux)
  const order = useSelector((state) => 
    state.orders.orders.find((o) => o.id === id)
  );

  // Якщо раптом замовлення не знайдено
  if (!order) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ fontSize: 18, marginBottom: 20 }}>Замовлення не знайдено 😢</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ backgroundColor: '#e334e3', padding: 10, borderRadius: 10 }}>
          <Text style={{ color: 'white' }}>Повернутись назад</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Визначаємо поточний крок для Timeline
  let currentStep = 1; // Готується
  if (order.status === 'courier') currentStep = 2; // Кур'єр їде
  if (order.status === 'completed') currentStep = 3; // Доставлено

  const steps = [
    { title: "Прийнято", icon: "checkmark-circle", time: "10:00" },
    { title: "Готується 👨‍🍳", icon: "flame", time: "10:05" },
    { title: "Кур'єр їде 🛵", icon: "bicycle", time: "10:20" },
    { title: "Доставлено 🎉", icon: "home", time: "10:45" },
  ];

  const handleCallCourier = () => {
    Alert.alert("Дзвінок кур'єру", "Набираємо +380 99 123 45 67...");
  };

  const renderItem = ({ item }) => (
    <View style={[styles.itemRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.qty, { color: theme.text }]}>{item.quantity}x</Text>
      <Text style={[styles.itemName, { color: theme.text }]}>{item.name}</Text>
      <Text style={[styles.itemPrice, { color: theme.text }]}>{item.price * item.quantity} ₴</Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Замовлення #{order.id.slice(-4)}</Text>
        <View style={{width: 24}} />
      </View>

      <FlatList
        data={order.items}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        ListHeaderComponent={() => (
          <View>
            
            {/* 👇 ВСТАВЛЯЙ ЦЕЙ БЛОК (Він покаже кур'єра ЗАВЖДИ) */}
            <View style={[styles.courierCard, { backgroundColor: theme.card }]}>
                <View style={{flexDirection: 'row', alignItems: 'center'}}>
                    <Image 
                        source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }} 
                        style={styles.courierAvatar} 
                    />
                    <View style={{marginLeft: 15}}>
                        <Text style={[styles.courierName, { color: theme.text }]}>Олександр</Text>
                        <Text style={{color: theme.textSecondary, fontSize: 12}}>Ваш кур'єр • ⭐ 4.9</Text>
                    </View>
                </View>
                <TouchableOpacity style={styles.callBtn} onPress={handleCallCourier}>
                    <Ionicons name="call" size={20} color="white" />
                </TouchableOpacity>
            </View>

            {/* Таймлайн */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Статус доставки</Text>
            <View style={[styles.timelineBox, { backgroundColor: theme.card }]}>
                {steps.map((step, index) => {
                    const isActive = index <= currentStep;
                    
                    return (
                        <View key={index} style={styles.stepRow}>
                            <View style={{ alignItems: 'center', marginRight: 15 }}>
                                <View style={[styles.stepCircle, { backgroundColor: isActive ? '#e334e3' : theme.input }]}>
                                    <Ionicons name={step.icon} size={16} color={isActive ? 'white' : 'gray'} />
                                </View>
                                {index !== steps.length - 1 && (
                                    <View style={[styles.stepLine, { backgroundColor: isActive ? '#e334e3' : theme.input }]} />
                                )}
                            </View>
                            <View style={{ paddingBottom: 30 }}>
                                <Text style={[styles.stepTitleText, { color: isActive ? theme.text : 'gray', fontWeight: isActive ? 'bold' : 'normal' }]}>{step.title}</Text>
                            </View>
                        </View>
                    );
                })}
            </View>

             <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Товари</Text>
          </View>
        )}
        ListFooterComponent={() => (
           <View style={[styles.infoCard, { backgroundColor: theme.card, marginTop: 20 }]}>
              <View style={styles.infoRow}>
                  <Text style={{color: 'gray'}}>Дата:</Text>
                  {/* 👇 БЕРЕМО ДАТУ З REDUX */}
                  <Text style={{color: theme.text, fontWeight: 'bold'}}>
                    {new Date(order.date).toLocaleString('uk-UA')}
                  </Text>
              </View>
              <View style={[styles.divider, { backgroundColor: theme.border }]} />
              <View style={styles.infoRow}>
                  <Text style={{color: 'gray'}}>Сума:</Text>
                  {/* 👇 БЕРЕМО СУМУ З REDUX */}
                  <Text style={{color: '#e334e3', fontWeight: 'bold', fontSize: 24}}>{order.total} ₴</Text>
              </View>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  backBtn: { padding: 4 },
  
  courierCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderRadius: 16, marginBottom: 25, elevation: 3 },
  courierAvatar: { width: 50, height: 50, borderRadius: 25 },
  courierName: { fontSize: 18, fontWeight: 'bold' },
  callBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center' },

  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  timelineBox: { padding: 20, borderRadius: 16 },
  stepRow: { flexDirection: 'row' },
  stepCircle: { width: 30, height: 30, borderRadius: 15, justifyContent: 'center', alignItems: 'center', zIndex: 1 },
  stepLine: { width: 2, flex: 1, marginVertical: 4 },
  stepTitleText: { fontSize: 16, marginBottom: 4 },

  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1 },
  qty: { fontWeight: 'bold', marginRight: 12, width: 30 },
  itemName: { fontSize: 16, flex: 1 },
  itemPrice: { fontWeight: 'bold', fontSize: 16 },

  infoCard: { padding: 20, borderRadius: 16, marginBottom: 40 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, marginVertical: 15 },
});