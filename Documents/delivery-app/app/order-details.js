import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';

export default function OrderDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Розбираємо передані параметри (бо вони приходять як стрічки)
  const orderId = params.id;
  const orderTotal = params.total;
  const orderDate = params.date;
  
  // Фейковий статус (для краси)
  // 0 - Прийнято, 1 - Готується, 2 - Кур'єр в дорозі, 3 - Доставлено
  const [currentStep, setCurrentStep] = useState(1);

  // Імітуємо зміну статусу через 3 секунди
  useEffect(() => {
    const timer = setTimeout(() => {
        setCurrentStep(2); // Перемикаємо на "Кур'єр в дорозі"
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  const steps = [
    { title: "Прийнято", icon: "checkmark-circle", time: "10:00" },
    { title: "Готується 👨‍🍳", icon: "flame", time: "10:05" },
    { title: "Кур'єр їде 🛵", icon: "bicycle", time: "10:20" },
    { title: "Доставлено 🎉", icon: "home", time: "10:45" },
  ];

  const handleCallCourier = () => {
    Alert.alert("Дзвінок кур'єру", "Набираємо +380 99 123 45 67...");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Замовлення #{orderId ? orderId.slice(-4) : '0000'}</Text>
        <View style={{width: 24}} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 20 }}>
        
        {/* Блок Кур'єра */}
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

        {/* Таймлайн (Статуси) */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Статус доставки</Text>
        <View style={[styles.timelineBox, { backgroundColor: theme.card }]}>
            {steps.map((step, index) => {
                const isActive = index <= currentStep; // Чи пройдений цей етап
                const isCurrent = index === currentStep; // Чи це поточний етап

                return (
                    <View key={index} style={styles.stepRow}>
                        {/* Лінія зліва */}
                        <View style={{ alignItems: 'center', marginRight: 15 }}>
                            <View style={[
                                styles.stepCircle, 
                                { backgroundColor: isActive ? '#e334e3' : theme.input }
                            ]}>
                                <Ionicons name={step.icon} size={16} color={isActive ? 'white' : 'gray'} />
                            </View>
                            {index !== steps.length - 1 && (
                                <View style={[
                                    styles.stepLine, 
                                    { backgroundColor: isActive ? '#e334e3' : theme.input }
                                ]} />
                            )}
                        </View>
                        
                        {/* Текст */}
                        <View style={{ paddingBottom: 30 }}>
                            <Text style={[
                                styles.stepTitleText, 
                                { 
                                    color: isActive ? theme.text : 'gray',
                                    fontWeight: isCurrent ? 'bold' : 'normal'
                                }
                            ]}>{step.title}</Text>
                            <Text style={{ color: 'gray', fontSize: 12 }}>{step.time}</Text>
                        </View>
                    </View>
                );
            })}
        </View>

        {/* Інфо про замовлення */}
        <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Деталі</Text>
        <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
            <View style={styles.infoRow}>
                <Text style={{color: 'gray'}}>Дата:</Text>
                <Text style={{color: theme.text, fontWeight: 'bold'}}>{orderDate}</Text>
            </View>
            <View style={[styles.divider, { backgroundColor: theme.border }]} />
            <View style={styles.infoRow}>
                <Text style={{color: 'gray'}}>Сума:</Text>
                <Text style={{color: '#e334e3', fontWeight: 'bold', fontSize: 18}}>{orderTotal} грн</Text>
            </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  
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

  infoCard: { padding: 20, borderRadius: 16, marginBottom: 40 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  divider: { height: 1, marginVertical: 15 },
});