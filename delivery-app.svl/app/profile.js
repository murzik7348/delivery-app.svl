import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, useColorScheme, View, RefreshControl, Platform } from 'react-native';
import Constants from 'expo-constants';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { useFocusEffect } from 'expo-router';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { fetchMe, logoutUser, removeAddress } from '../store/authSlice';
import { clearOrders } from '../store/ordersSlice';
import { clearCourierState } from '../store/courierSlice';
import { deleteAddress as apiDeleteAddress, getAddresses } from '../src/api';
import { persistor } from '../store/index';
const getNotifications = () => {
  if (Platform.OS === 'android' && Constants.appOwnership === 'expo') return null;
  try {
    return require('expo-notifications');
  } catch (e) {
    return null;
  }
};
const Notifications = getNotifications();

import { resolveImageUrl } from '../src/api/client';
import BackButton from '../components/BackButton';

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { isAuthenticated, user } = useSelector((state) => state.auth);
  const savedAddresses = useSelector((state) => state.auth?.addresses || []);
  const favoriteIds = useSelector((state) => state.favorites.ids);
  const locale = useSelector((state) => state.language?.locale ?? 'uk');

  const [modalVisible, setModalVisible] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [liveAddresses, setLiveAddresses] = useState(null); // null = not yet loaded

  useFocusEffect(
    useCallback(() => {
      refreshData();
    }, [])
  );

  const openAddressModal = async () => {
    setModalVisible(true);
    refreshData();
  };

  const refreshData = async () => {
    setAddressesLoading(true);
    try {
      const fetched = await getAddresses();
      setLiveAddresses(Array.isArray(fetched) ? fetched : fetched?.items ?? []);
      // Also refresh user profile to get updated order counts
      dispatch(fetchMe());
    } catch {
      setLiveAddresses(null);
    } finally {
      setAddressesLoading(false);
    }
  };

  const displayAddresses = liveAddresses ?? savedAddresses;
  const handleLogout = () => {
    Alert.alert(t(locale, 'logout'), t(locale, 'logout') + '?', [
      { text: t(locale, 'no') ?? 'Ні', style: 'cancel' },
      { text: t(locale, 'yes') ?? 'Так', style: 'destructive', onPress: async () => {
        dispatch(logoutUser());
        dispatch(clearOrders());
        dispatch(clearCourierState());
        // Force purge of persistent storage to prevent data leakage between accounts
        try {
          await persistor.purge();
        } catch (e) {
          console.warn('[Profile] persistor.purge failed:', e);
        }
      } }
    ]);
  };

  const handleDeleteAddress = (id) => {
    Alert.alert('Видалення', 'Видалити цю адресу?', [
      { text: 'Ні', style: 'cancel' },
      {
        text: 'Так',
        style: 'destructive',
        onPress: async () => {
          try {
            // Delete via API uses id
            await apiDeleteAddress(id);
          } catch (err) {
            console.warn('[Profile] deleteAddress API error:', err.message);
          }
          dispatch(removeAddress(id));
          setLiveAddresses((prev) => prev ? prev.filter((a) => (a.addressId || a.id) !== id) : null);
        },
      },
    ]);
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.guestContent}>
          <View style={styles.iconCircle}>
            <Ionicons name="person" size={60} color="white" />
          </View>
          <Text style={[styles.guestTitle, { color: theme.text }]}>{t(locale, 'welcome')}</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            {t(locale, 'loginPrompt')}
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={() => router.push('/register')}>
            <Text style={styles.primaryBtnText}>{t(locale, 'createAccount')}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={() => router.push('/(auth)/login')}>
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>{t(locale, 'login')}</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </View>
    );
  }
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
        <View style={{ paddingHorizontal: 16, paddingTop: 10 }}>
          <BackButton />
        </View>
        <ScrollView 
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={addressesLoading}
              onRefresh={refreshData}
              tintColor="#e334e3"
              colors={["#e334e3"]}
            />
          }
        >

          {/* Шапка профілю */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: resolveImageUrl(user?.avatarUrl || user?.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500' }}
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

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t(locale, 'activity').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            {(user?.role?.toLowerCase() === 'courier' || user?.role?.toLowerCase() === 'курєр' || Number(user?.role) === 1) && (
              <MenuItem
                icon="bicycle-outline"
                label={locale === 'en' ? 'Courier Delivery' : 'Доставка кур\'єром'}
                onPress={() => router.push('/courier')}
              />
            )}
            <MenuItem icon="receipt-outline" label={t(locale, 'myOrders')} onPress={() => router.push('/orders')} />
            <MenuItem
              icon="heart-outline"
              label={t(locale, 'favoriteStores')}
              badge={favoriteIds.length > 0 ? favoriteIds.length.toString() : null}
              onPress={() => router.push('/favorites')}
            />
            <MenuItem icon="ticket-outline" label={t(locale, 'promoCodes')} isLast onPress={() => router.push('/promocodes')} />
          </View>

          <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>{t(locale, 'settings').toUpperCase()}</Text>
          <View style={[styles.section, { backgroundColor: theme.card }]}>
            <MenuItem icon="card-outline" label={t(locale, 'paymentMethods')} onPress={() => router.push('/payment')} />
            <MenuItem icon="location-outline" label={t(locale, 'savedAddresses')} onPress={openAddressModal} />
            <MenuItem icon="notifications-outline" label={t(locale, 'notifications')} />
            <MenuItem 
              icon="paper-plane-outline" 
              label="Test Notification" 
              onPress={async () => {
                if (Notifications && Notifications.scheduleNotificationAsync) {
                  await Notifications.scheduleNotificationAsync({
                    content: {
                      title: "🔔 Test Notification",
                      body: "Система сповіщень працює!",
                    },
                    trigger: null,
                  });
                } else {
                  Alert.alert("Сповіщення", "Ця функція недоступна в Expo Go для Android у цьому SDK.");
                }
              }} 
            />
            <MenuItem icon="language-outline" label={t(locale, 'language')} isLast onPress={() => router.push('/language')} />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t(locale, 'logout')}</Text>
          </TouchableOpacity>
          <Text style={[styles.version, { color: theme.textSecondary }]}>{t(locale, 'version')}</Text>

        </ScrollView>
      </SafeAreaView>

      {/* Модалка Адрес */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t(locale, 'myAddresses')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={displayAddresses}
              keyExtractor={(item) => (item.addressId || item.id).toString()}
              ListEmptyComponent={
                addressesLoading
                  ? <ActivityIndicator color="#e334e3" style={{ marginTop: 30 }} />
                  : <Text style={{ textAlign: 'center', color: 'gray', marginTop: 20 }}>{t(locale, 'noAddresses')}</Text>
              }
              renderItem={({ item }) => (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 15,
                  marginBottom: 10,
                  backgroundColor: '#f9f9f9',
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: '#eee'
                }}>
                  {/* Ліва частина: Назва і Вулиця */}
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: 'black' }}>
                      {item.name || item.title || 'Адреса'}
                    </Text>
                    <Text style={{ fontSize: 14, color: 'gray', marginTop: 2 }}>
                      {item.address || (item.house ? `буд. ${item.house}${item.apartment ? `, кв. ${item.apartment}` : ''}` : '')}
                    </Text>
                  </View>

                  {/* Права частина: Кнопка видалити */}
                  <TouchableOpacity onPress={() => handleDeleteAddress(item.addressId || item.id)} style={{ padding: 5 }}>
                    <Ionicons name="trash-outline" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* 👇 ТІЛЬКИ ОДНА ЧОРНА КНОПКА (рожеву видалено повністю) */}
            <TouchableOpacity
              style={styles.pinkAddBtn}
              onPress={() => { setModalVisible(false); router.push('/location-picker'); }}
              activeOpacity={0.8}
            >
              <Ionicons name="add" size={24} color="white" />
              <Text style={styles.pinkAddBtnText}>{t(locale, 'addNewAddress')}</Text>
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
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 3, borderColor: '#e334e3' },
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
  addNewBtn: { flexDirection: 'row', backgroundColor: 'black', padding: 18, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  addNewText: { color: 'white', fontWeight: 'bold', marginLeft: 10, fontSize: 16 },
  pinkAddBtn: {
    flexDirection: 'row',
    backgroundColor: '#e334e3',
    padding: 16,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20
  },
  pinkAddBtnText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 10,
    fontSize: 16
  }
});