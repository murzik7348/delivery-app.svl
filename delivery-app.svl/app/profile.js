import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useCallback, useState, useRef, useEffect } from 'react';
import { Alert, ActivityIndicator, FlatList, Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, RefreshControl, Platform } from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import { setBottomBarVisible } from '../store/uiSlice';
import { useFocusEffect } from 'expo-router';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { fetchMe, logoutUser, removeAddress } from '../store/authSlice';
import { clearOrders } from '../store/ordersSlice';
import { clearCourierState } from '../store/courierSlice';
import { deleteAddress as apiDeleteAddress, getAddresses } from '../src/api';
import { persistor } from '../store/index';

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
  const [mapRendered, setMapRendered] = useState(false);
  const [addressesLoading, setAddressesLoading] = useState(false);
  const [liveAddresses, setLiveAddresses] = useState(null); // null = not yet loaded

  useEffect(() => {
    if (!modalVisible) {
      setMapRendered(false);
    }
  }, [modalVisible]);

  const mapRef = useRef(null);
  const markerRefs = useRef({});
  const displayAddresses = liveAddresses ?? savedAddresses;

  const mapAddresses = (displayAddresses || []).filter(addr => {
    const lat = parseFloat(addr.latitude);
    const lng = parseFloat(addr.longitude);
    return !isNaN(lat) && !isNaN(lng);
  });

  const getInitialRegion = () => {
    if (mapAddresses.length > 0) {
      return {
        latitude: parseFloat(mapAddresses[0].latitude),
        longitude: parseFloat(mapAddresses[0].longitude),
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }
    return {
      latitude: 50.4501,
      longitude: 30.5234,
      latitudeDelta: 0.0922,
      longitudeDelta: 0.0421,
    };
  };

  const handleFocusAddress = (addr) => {
    const lat = parseFloat(addr.latitude);
    const lng = parseFloat(addr.longitude);
    const id = addr.addressId || addr.id;
    if (mapRef.current && !isNaN(lat) && !isNaN(lng)) {
      mapRef.current.animateToRegion({
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      }, 600);

      setTimeout(() => {
        const marker = markerRefs.current[id];
        if (marker && marker.showCallout) {
          marker.showCallout();
        }
      }, 450);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (isAuthenticated) {
        refreshData();
      }
    }, [isAuthenticated])
  );

  const openAddressModal = async () => {
    setModalVisible(true);
    refreshData();
  };

  const refreshData = async () => {
    setAddressesLoading(true);
    try {
      const fetched = await getAddresses();
      const rawList = Array.isArray(fetched) ? fetched : fetched?.items ?? [];
      const mapped = rawList.map(addr => ({
        ...addr,
        address: addr.address || [
          addr.title,
          addr.house ? `буд. ${addr.house}` : '',
          addr.apartment ? `кв. ${addr.apartment}` : ''
        ].filter(Boolean).join(', ')
      }));
      setLiveAddresses(mapped);
      // Also refresh user profile to get updated order counts
      dispatch(fetchMe());
    } catch {
      setLiveAddresses(null);
    } finally {
      setAddressesLoading(false);
    }
  };

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

  const lastScrollY = useRef(0);
  const handleScroll = (event) => {
    const currentOffset = event.nativeEvent.contentOffset.y;
    const isScrollingDown = currentOffset > lastScrollY.current;
    
    if (Math.abs(currentOffset - lastScrollY.current) > 15) {
      if (currentOffset <= 0) {
        dispatch(setBottomBarVisible(true));
      } else if (isScrollingDown && currentOffset > 100) {
        dispatch(setBottomBarVisible(false));
      } else {
        dispatch(setBottomBarVisible(true));
      }
      lastScrollY.current = currentOffset;
    }
  };

  if (!isAuthenticated) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <SafeAreaView style={styles.guestContent}>
          <View style={[styles.iconCircle, { backgroundColor: theme.primary }]}>
            <Ionicons name="person" size={60} color="white" />
          </View>
          <Text style={[styles.guestTitle, { color: theme.text }]}>{t(locale, 'welcome')}</Text>
          <Text style={[styles.guestSubtitle, { color: theme.textSecondary }]}>
            {t(locale, 'loginPrompt')}
          </Text>
          <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: theme.primary }]} onPress={() => router.push('/register')}>
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
        { backgroundColor: theme.card, borderBottomColor: theme.border, borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth }
      ]}
    >
      <View style={styles.menuRow}>
        <View style={[styles.iconBox, { backgroundColor: theme.input }]}>
          <Ionicons name={icon} size={20} color={theme.text} />
        </View>
        <Text style={[styles.menuText, { color: theme.text }]}>{label}</Text>
      </View>
      <View style={styles.menuRow}>
        {badge && <View style={[styles.badge, { backgroundColor: theme.primary }]}><Text style={styles.badgeText}>{badge}</Text></View>}
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
          onScroll={handleScroll}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={addressesLoading}
              onRefresh={refreshData}
              tintColor={theme.primary}
              colors={[theme.primary]}
            />
          }
        >

          {/* Шапка профілю */}
          <View style={styles.header}>
            <View style={styles.avatarContainer}>
              <Image
                source={{ uri: resolveImageUrl(user?.avatarUrl || user?.avatar) || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=500' }}
                style={[styles.avatar, { borderColor: theme.primary }]}
              />
              {/* 👇 ОСЬ ТУТ КНОПКА РЕДАГУВАННЯ (ОЛІВЕЦЬ) */}
              <TouchableOpacity style={[styles.editBtn, { backgroundColor: theme.primary }]}
                  activeOpacity={0.8} onPress={() => router.push('/profile-edit')}>
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
            <MenuItem icon="language-outline" label={t(locale, 'language')} isLast onPress={() => router.push('/language')} />
          </View>

          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
            <Text style={styles.logoutText}>{t(locale, 'logout')}</Text>
          </TouchableOpacity>
          <Text style={[styles.version, { color: theme.textSecondary }]}>{t(locale, 'version')}</Text>

        </ScrollView>
      </SafeAreaView>

      {/* Модалка Адрес */}
      <Modal 
        animationType="slide" 
        transparent={true} 
        visible={modalVisible} 
        onRequestClose={() => setModalVisible(false)}
        onShow={() => {
          setTimeout(() => {
            setMapRendered(true);
          }, 250);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{t(locale, 'myAddresses')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close-circle" size={30} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Міні-карта зі збереженими адресами */}
            {mapAddresses.length > 0 && (
              <View style={styles.miniMapContainer}>
                {mapRendered ? (
                  <MapView
                    ref={mapRef}
                    provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
                    style={styles.miniMap}
                    initialRegion={getInitialRegion()}
                    showsUserLocation={false}
                    rotateEnabled={false}
                    pitchEnabled={false}
                    userInterfaceStyle={colorScheme}
                  >
                    {mapAddresses.map((addr, idx) => (
                      <Marker
                        ref={(ref) => {
                          if (ref) {
                            markerRefs.current[addr.addressId || addr.id] = ref;
                          }
                        }}
                        key={`marker-${addr.addressId || addr.id || idx}`}
                        coordinate={{
                          latitude: parseFloat(addr.latitude),
                          longitude: parseFloat(addr.longitude),
                        }}
                        title={addr.name || addr.title || 'Адреса'}
                        description={addr.address}
                        pinColor={theme.primary}
                      />
                    ))}
                  </MapView>
                ) : (
                  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colorScheme === 'dark' ? '#1c1c1e' : '#f2f2f7' }}>
                    <ActivityIndicator size="small" color={theme.primary} />
                  </View>
                )}
              </View>
            )}

            <FlatList
              data={displayAddresses}
              keyExtractor={(item) => (item.addressId || item.id).toString()}
              ListEmptyComponent={
                addressesLoading
                  ? <ActivityIndicator color={theme.primary} style={{ marginTop: 30 }} />
                  : <Text style={{ textAlign: 'center', color: 'gray', marginTop: 20 }}>{t(locale, 'noAddresses')}</Text>
              }
              renderItem={({ item }) => (
                <View style={{
                  flexDirection: 'row',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: 15,
                  marginBottom: 10,
                  backgroundColor: colorScheme === 'dark' ? '#2c2c2e' : '#f9f9f9',
                  borderRadius: 12,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: theme.border,
                  ...Platform.select({
                    ios: { shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 5, shadowOffset: { width: 0, height: 2 } },
                    android: { elevation: 1 }
                  })
                }}>
                  {/* Ліва частина: Назва і Вулиця (Клікабельна для фокусування карти) */}
                  <TouchableOpacity
                    style={{ flex: 1, marginRight: 10 }}
                    activeOpacity={0.7}
                    onPress={() => handleFocusAddress(item)}
                  >
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: theme.text }}>
                      {item.name || item.title || 'Адреса'}
                    </Text>
                    <Text style={{ fontSize: 14, color: theme.textSecondary, marginTop: 2 }}>
                      {item.address || [
                        item.title,
                        item.house ? `буд. ${item.house}` : '',
                        item.apartment ? `кв. ${item.apartment}` : ''
                      ].filter(Boolean).join(', ')}
                    </Text>
                  </TouchableOpacity>

                  {/* Права частина: Кнопка видалити */}
                  <TouchableOpacity onPress={() => handleDeleteAddress(item.addressId || item.id)} style={{ padding: 5 }}>
                    <Ionicons name="trash-outline" size={24} color="red" />
                  </TouchableOpacity>
                </View>
              )}
            />

            {/* 👇 ТІЛЬКИ ОДНА ЧОРНА КНОПКА (рожеву видалено повністю) */}
            <TouchableOpacity
              style={[styles.pinkAddBtn, { backgroundColor: theme.primary }]}
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
  iconCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#000000', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  guestTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 12, textAlign: 'center' },
  guestSubtitle: { fontSize: 16, textAlign: 'center', marginBottom: 40, lineHeight: 24 },
  primaryBtn: { width: '100%', height: 56, backgroundColor: '#000000', borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  primaryBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  secondaryBtn: { width: '100%', height: 56, borderWidth: StyleSheet.hairlineWidth, borderRadius: 16, justifyContent: 'center', alignItems: 'center' },
  secondaryBtnText: { fontSize: 18, fontWeight: '600' },
  header: { alignItems: 'center', marginVertical: 20 },
  avatarContainer: { position: 'relative', marginBottom: 15 },
  avatar: { width: 100, height: 100, borderRadius: 50, borderWidth: 2, borderColor: '#000000' },
  editBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#000000', padding: 8, borderRadius: 20, borderWidth: 2, borderColor: 'white' },
  name: { fontSize: 24, fontWeight: 'bold', marginBottom: 5 },
  phone: { fontSize: 16 },
  sectionTitle: { marginLeft: 16, marginBottom: 8, marginTop: 24, fontSize: 13, textTransform: 'uppercase', fontWeight: '600' },
  section: { 
    borderRadius: 16, marginHorizontal: 16, overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.02, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 1 }
    })
  },
  menuItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, height: 56 },
  menuRow: { flexDirection: 'row', alignItems: 'center' },
  iconBox: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  menuText: { fontSize: 16, fontWeight: '500' },
  badge: { backgroundColor: '#000000', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginRight: 8 },
  badgeText: { color: 'white', fontSize: 12, fontWeight: 'bold' },
  logoutBtn: { marginHorizontal: 16, marginTop: 30, padding: 16, borderRadius: 16, backgroundColor: 'rgba(255, 0, 0, 0.1)', alignItems: 'center' },
  logoutText: { color: 'red', fontSize: 16, fontWeight: 'bold' },
  version: { textAlign: 'center', marginTop: 20, fontSize: 12 },
  modalOverlay: { flex: 1, backgroundColor: 'transparent', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, height: '80%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  miniMapContainer: {
    height: 180,
    width: '100%',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.1)',
  },
  miniMap: {
    width: '100%',
    height: '100%',
  },
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
    backgroundColor: '#000000',
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