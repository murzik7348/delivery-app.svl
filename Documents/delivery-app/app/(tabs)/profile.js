import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { logout } from '../../store/authSlice';
import { removeAddress } from '../../store/locationSlice';

// 👇 Імпорт шторки
import AddressBottomSheet from '../../components/AddressBottomSheet';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // 👇 СТВОРЮЄМО ЗМІННУ (Правильна назва)
  const [isAddressSheetVisible, setAddressSheetVisible] = useState(false);

  const user = useSelector((state) => state.auth.user);
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const savedAddresses = useSelector((state) => state.location.savedAddresses);

  const handleLogout = () => {
    Alert.alert('Вихід', 'Ви впевнені, що хочете вийти?', [
      { text: 'Ні', style: 'cancel' },
      { text: 'Так', style: 'destructive', onPress: () => {
          dispatch(logout());
          router.replace('/(auth)/login');
      }},
    ]);
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Ionicons name="person-circle-outline" size={100} color="gray" />
        <Text style={{ color: theme.text, fontSize: 18, marginVertical: 20 }}>Ви не авторизовані</Text>
        <TouchableOpacity style={styles.loginBtn} onPress={() => router.push('/(auth)/login')}>
          <Text style={{ color: 'white', fontWeight: 'bold' }}>Увійти</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* Шапка */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Профіль</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#ff3b30" />
          </TouchableOpacity>
        </View>

        {/* Інфо про юзера */}
        <View style={styles.userInfo}>
          <Image source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }} style={styles.avatar} />
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>{user?.name || 'Користувач'}</Text>
            <Text style={{ color: 'gray' }}>{user?.email || 'email@example.com'}</Text>
          </View>
        </View>

        {/* === БЛОК АДРЕС === */}
        <View style={styles.addressSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Мої адреси 🏠</Text>

          {/* Список адрес */}
          {savedAddresses.length === 0 ? (
             <Text style={{ textAlign: 'center', color: 'gray', marginVertical: 10 }}>
               Немає збережених адрес
             </Text>
          ) : (
            savedAddresses.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                <View style={styles.iconCircle}>
                  <Ionicons name="location-sharp" size={24} color="#e334e3" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressName, { color: 'black' }]}>{item.name}</Text>
                  <Text style={styles.addressStreet} numberOfLines={1}>{item.address}</Text>
                </View>
                {/* Кнопка видалення */}
                <TouchableOpacity onPress={() => dispatch(removeAddress(item.id))} style={styles.deleteBtn}>
                  <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* 👇 ЦЯ КНОПКА ТЕПЕР ВІДКРИВАЄ ШТОРКУ (використовує правильну змінну) */}
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setAddressSheetVisible(true)} 
          >
            <Text style={styles.addButtonText}>Керувати адресами</Text>
          </TouchableOpacity>

        </View>
      </ScrollView>

      {/* 👇 ШТОРКА (використовує правильну змінну) */}
      <AddressBottomSheet 
        visible={isAddressSheetVisible} 
        onClose={() => setAddressSheetVisible(false)} 
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 28, fontWeight: 'bold' },
  userInfo: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 30 },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#eee' },
  userName: { fontSize: 20, fontWeight: 'bold' },
  loginBtn: { backgroundColor: '#e334e3', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 12 },
  
  // Стилі адрес
  addressSection: { paddingHorizontal: 20, marginTop: 10 },
  sectionTitle: { fontSize: 22, fontWeight: 'bold', marginBottom: 15, marginLeft: 5 },
  addressCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: 'white',
    paddingVertical: 15, paddingHorizontal: 10,
    borderBottomWidth: 1, borderBottomColor: '#f0f0f0', marginBottom: 5, borderRadius: 12,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22, borderWidth: 2, borderColor: '#2d0a30',
    justifyContent: 'center', alignItems: 'center', marginRight: 15, backgroundColor: 'white',
  },
  addressName: { fontSize: 17, fontWeight: 'bold' },
  addressStreet: { fontSize: 14, color: 'gray', marginTop: 2 },
  deleteBtn: { padding: 10, backgroundColor: '#FFF5F5', borderRadius: 10 },
  
  // Кнопка
  addButton: {
    marginTop: 25, backgroundColor: 'black', borderRadius: 16, paddingVertical: 16,
    flexDirection: 'row', justifyContent: 'center', alignItems: 'center',
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 5, elevation: 5,
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});