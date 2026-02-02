import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../../constants/Colors';
import { logoutUser } from '../../store/authSlice';
import { deleteAddress } from '../../store/locationSlice';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // Дані з Redux
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const { savedAddresses } = useSelector((state) => state.location);
  // Щоб показувати кількість улюблених закладів
  const favoriteIds = useSelector((state) => state.favorites.ids);

  const [modalVisible, setModalVisible] = useState(false);

  // --- ЛОГІКА ВИХОДУ ---
  const handleLogout = () => {
    Alert.alert("Вихід", "Вийти з акаунту?", [
      { text: "Ні", style: "cancel" },
      { text: "Так", style: "destructive", onPress: () => dispatch(logoutUser()) }
    ]);
  };

  const handleDeleteAddress = (id) => {
    Alert.alert("Видалення", "Видалити цю адресу?", [
      { text: "Ні", style: "cancel" },
      { text: "Так", style: "destructive", onPress: () => dispatch(deleteAddress(id)) }
    ]);
  };

  // --- ЕКРАН ДЛЯ ГОСТЯ (Якщо не увійшов) ---
  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.guestContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={60} color="white" />
          </View>
          <Text style={[styles.guestTitle, { color: theme.text }]}>Вітаємо!</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            Увійдіть, щоб бачити історію замовлень та свої дані.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register')}>
            <Text style={styles.primaryBtnText}>Створити акаунт</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Увійти</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }

  // Компонент одного пункту меню
  const MenuItem = ({ icon, label, isLast, badge, onPress }) => (
    <TouchableOpacity 
      onPress={onPress} 
      style={[
        styles.menuItem, 
        { backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: isLast ? 0 : 1 }
      ]}
    >
      <View style={styles.menuRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.input }]}>
          <Ionicons name={icon} size={20} color={theme.text} />
        </View>
        <Text style={[styles.menuText, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.menuRow}>
        {badge && <View style={styles.badge}><Text style={styles.badgeText}>{badge}</Text></View>}
        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
          
          {/* Шапка профілю */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image 
                source={{ uri: user?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500' }} 
                style={styles.avatar} 
              />
              {/* 👇 ОСЬ ТУТ КНОПКА РЕДАГУВАННЯ (ОЛІВЕЦЬ) */}
              <TouchableOpacity style={styles.editBtn} onPress={() => router.push('/profile-edit')}>
                <Ionicons name="pencil" size={14} color="white" />
              </TouchableOpacity>
            </View>
            <Text style={[styles.name, { color: theme.text }]}>{user?.name || 'Користувач'}</Text>
            <Text style={[styles.phone, { color: theme.textSecondary }]}>{user?.phone || 'Телефон не вказано'}</Text>
          </View>

          {/* --- БЛОК 1: АКТИВНІСТЬ --- */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Активність</Text>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            
            <MenuItem 
              icon="receipt-outline" 
              label="Мої замовлення" 
              onPress={() => router.push('/orders')} 
            />
            
            <MenuItem 
              icon="heart-outline" 
              label="Улюблені заклади" 
              badge={favoriteIds.length > 0 ? favoriteIds.length.toString() : null}
              onPress={() => router.push('/favorites')} 
            />

            <MenuItem 
              icon="ticket-outline" 
              label="Промокоди" 
              isLast 
              onPress={() => router.push('/promocodes')}
            />
          </View>

          {/* --- БЛОК 2: НАЛАШТУВАННЯ --- */}
          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>Налаштування</Text>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            
            <MenuItem 
              icon="card-outline" 
              label="Методи оплати" 
              onPress={() => router.push('/payment')}
            />
            
            <MenuItem 
              icon="location-outline" 
              label="Збережені адреси" 
              onPress={() => setModalVisible(true)} 
            />
            
            <MenuItem icon="notifications-outline" label="Сповіщення" />
            <MenuItem icon="language-outline" label="Мова" isLast />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>Вийти з акаунту</Text>
          </TouchableOpacity>
          
          <Text style={[styles.version, { color: theme.textSecondary }]}>Версія 1.0.0</Text>

        </ScrollView>
      </SafeAreaView>

      {/* Модалка Адрес */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Мої адреси 🏠</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={savedAddresses}
              keyExtractor={(item) => item.id.toString()}
              ListEmptyComponent={<Text style={{textAlign: 'center', color: theme.textSecondary, marginTop: 20}}>Немає збережених адрес</Text>}
              renderItem={({ item }) => (
                <View style={[styles.addressItem, { borderColor: theme.border }]}>
                  <View style={styles.addressInfo}>
                    <View style={[styles.iconBox, { backgroundColor: theme.input }]}>
                       <Ionicons name="location" size={20} color="#e334e3" />
                    </View>
                    <View style={{marginLeft: 12, flex: 1}}>
                      <Text style={[styles.addrName, { color: theme.text }]}>{item.name}</Text>
                      <Text style={[styles.addrDesc, { color: theme.textSecondary }]} numberOfLines={1}>{item.address}</Text>
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDeleteAddress(item.id)} style={[styles.deleteBtn, { backgroundColor: theme.input }]}>
                    <Ionicons name="trash-outline" size={22} color="red" />
                  </TouchableOpacity>
                </View>
              )}
            />
            <TouchableOpacity style={styles.addNewBtn} onPress={() => { setModalVisible(false); router.push('/location-picker'); }}>
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.addNewText}>Додати нову адресу</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  guestContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#e334e3', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  guestTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  guestSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  primaryBtn: { width: '100%', height: 56, backgroundColor: '#e334e3', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { width: '100%', height: 56, borderWidth: 1, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 18, fontWeight: '600' },
  header: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#e334e3' }, // Додав рамку для краси
  editBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#e334e3', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: 'white' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  phone: { fontSize: 16 },
  sectionTitle: { marginLeft: 16, marginBottom: 8, marginTop: 24, fontSize: 13, textTransform: 'uppercase', fontWeight: '600' },
  section: { borderRadius: 16, marginHorizontal: 16, overflow: 'hidden' },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, height: 56 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { fontSize: 16, fontWeight: '500' },
  badge: { backgroundColor: '#e334e3', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  logoutBtn: { marginHorizontal: 16, marginTop: 30, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 0, 0, 0.1)', alignItems: 'center' },
  logoutText: { color: 'red', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', marginTop: 20, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, height: '60%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 22, fontWeight: 'bold' },
  addressItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 16, borderBottomWidth: 1 },
  addressInfo: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  addrName: { fontWeight: 'bold', fontSize: 16 },
  addrDesc: { fontSize: 13, marginTop: 2 },
  deleteBtn: { padding: 10, borderRadius: 10, marginLeft: 10 },
  addNewBtn: { flexDirection: 'row', backgroundColor: '#e334e3', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  addNewText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
});