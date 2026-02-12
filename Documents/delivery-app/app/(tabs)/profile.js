import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import * as authSlice from '../../store/authSlice';
import { removeAddress } from '../../store/locationSlice';

import AddressBottomSheet from '../../components/AddressBottomSheet';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [isAddressSheetVisible, setAddressSheetVisible] = useState(false);

  // Отримуємо дані з Redux
  const user = useSelector((state) => state.auth.user);
  const savedAddresses = useSelector((state) => state.location.savedAddresses);

  // Функція виходу
  const handleLogout = () => {
    Alert.alert('Вихід', 'Ви впевнені, що хочете вийти?', [
      { text: 'Ні', style: 'cancel' },
      {
        text: 'Так',
        style: 'destructive',
        onPress: () => {
          dispatch(authSlice.logout());
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  // Компонент для пункту меню
  const MenuItem = ({ icon, label, onPress, badge, isLast }) => (
    <TouchableOpacity style={styles.menuItem} onPress={onPress}>
      <View style={styles.menuItemLeft}>
        <Ionicons name={icon} size={24} color="#333" />
        <Text style={styles.menuText}>{label}</Text>
      </View>
      <View style={styles.menuItemRight}>
        {badge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        )}
        <Ionicons name="chevron-forward" size={20} color="#ccc" />
      </View>
      {!isLast && <View style={styles.separator} />}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        
        {/* Шапка профілю */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.text }]}>Профіль</Text>
          <TouchableOpacity onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={28} color="#ff3b30" />
          </TouchableOpacity>
        </View>

        {/* Інфо користувача */}
        <View style={styles.userInfo}>
          <Image
            source={{ uri: 'https://randomuser.me/api/portraits/men/1.jpg' }}
            style={styles.avatar}
          />
          <View>
            <Text style={[styles.userName, { color: theme.text }]}>
              {user?.name || 'Користувач'}
            </Text>
            <Text style={{ color: 'gray' }}>
              {user?.email || 'email@example.com'}
            </Text>
          </View>
        </View>

        {/* Секція АКТИВНІСТЬ */}
        <Text style={styles.sectionHeader}>АКТИВНІСТЬ</Text>
        <View style={styles.sectionBlock}>
          <MenuItem icon="receipt-outline" label="Мої замовлення" onPress={() => router.push('/orders')} />
          <MenuItem icon="heart-outline" label="Улюблені заклади" badge="3" onPress={() => router.push('/favorites')} />
          <MenuItem icon="ticket-outline" label="Промокоди" onPress={() => router.push('/promocodes')} isLast />
        </View>

        {/* Секція НАЛАШТУВАННЯ */}
        <Text style={styles.sectionHeader}>НАЛАШТУВАННЯ</Text>
        <View style={styles.sectionBlock}>
          <MenuItem icon="card-outline" label="Методи оплати" onPress={() => router.push('/payment')} />
          <MenuItem 
            icon="location-outline" 
            label="Збережені адреси" 
            onPress={() => setAddressSheetVisible(true)} 
          />
          <MenuItem icon="notifications-outline" label="Сповіщення" onPress={() => {}} />
          <MenuItem icon="language-outline" label="Мова" onPress={() => {}} isLast />
        </View>

        {/* === БЛОК АДРЕС === */}
        <View style={styles.addressSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Мої адреси 🏠
          </Text>

          {savedAddresses.length === 0 ? (
            <Text style={{ textAlign: 'center', color: 'gray', marginVertical: 20 }}>
              У вас немає збережених адрес
            </Text>
          ) : (
            savedAddresses.map((item) => (
              <View key={item.id} style={styles.addressCard}>
                
                {/* Іконка в кружечку */}
                <View style={styles.iconCircle}>
                  <Ionicons name="location-sharp" size={24} color="#e334e3" />
                </View>

                {/* Текст */}
                <View style={{ flex: 1 }}>
                  <Text style={[styles.addressName, { color: 'black' }]}>
                    {item.name}
                  </Text>
                  <Text style={styles.addressStreet} numberOfLines={1}>
                    {item.address}
                  </Text>
                </View>

                {/* Кнопка видалення */}
                <TouchableOpacity
                  onPress={() => dispatch(removeAddress(item.id))}
                  style={styles.deleteBtn}
                >
                  <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* ЧОРНА КНОПКА ДОДАТИ */}
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => router.push('/location-picker')}
          >
            <Ionicons name="add" size={24} color="white" style={{ marginRight: 8 }} />
            <Text style={styles.addButtonText}>
              Додати нову адресу
            </Text>
          </TouchableOpacity>

        </View>
        {/* === КІНЕЦЬ БЛОКУ АДРЕС === */}

      </ScrollView>
    
      <AddressBottomSheet 
        visible={isAddressSheetVisible} 
        onClose={() => setAddressSheetVisible(false)} 
      />

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  
  // Шапка профілю (з файлу №1)
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  title: { fontSize: 28, fontWeight: 'bold' },
  
  // Інфо користувача (з файлу №1)
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  avatar: { width: 60, height: 60, borderRadius: 30, marginRight: 15, backgroundColor: '#eee' },
  userName: { fontSize: 20, fontWeight: 'bold' },

  // Секції меню (з файлу №2)
  sectionHeader: { marginLeft: 20, marginBottom: 10, marginTop: 20, fontSize: 12, color: 'gray', fontWeight: 'bold', textTransform: 'uppercase' },
  sectionBlock: { backgroundColor: 'white', paddingVertical: 0 },

  // Пункт меню (з файлу №2)
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 20 },
  menuItemLeft: { flexDirection: 'row', alignItems: 'center' },
  menuItemRight: { flexDirection: 'row', alignItems: 'center' },
  menuText: { fontSize: 16, marginLeft: 15, color: '#000' },
  separator: { position: 'absolute', bottom: 0, left: 60, right: 0, height: 1, backgroundColor: '#f0f0f0' },

  // Бейджик (з файлу №2)
  badge: { backgroundColor: '#e334e3', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2, marginRight: 8 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },

  // Стилі для адрес (з файлу №1)
  addressSection: {
    paddingHorizontal: 20,
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    marginLeft: 5,
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    paddingVertical: 15,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    marginBottom: 5,
    borderRadius: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#2d0a30',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    backgroundColor: 'white',
  },
  addressName: {
    fontSize: 17,
    fontWeight: 'bold',
  },
  addressStreet: {
    fontSize: 14,
    color: 'gray',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 10,
    backgroundColor: '#FFF5F5',
    borderRadius: 10,
  },
  
  // Кнопка додати (з файлу №1)
  addButton: {
    marginTop: 25,
    backgroundColor: 'black',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});