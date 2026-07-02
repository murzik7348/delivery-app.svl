import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { useColorScheme } from '../hooks/use-color-scheme';
import Colors from '../constants/Colors';
import {
  Alert,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Animated,
  KeyboardAvoidingView,
  PanResponder,
  Keyboard,
  Easing
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Marker, Polygon } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentLocation } from '../store/locationSlice';
import { fetchAddresses } from '../store/authSlice';
import { createAddress, getDeliveryZones } from '../src/api';
import { getZoneForLocation, getZoneColor } from '../utils/deliveryZones';
import { setCustomDeliveryFee } from '../store/cartSlice';
import BackButton from '../components/BackButton';

export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const savedAddresses = useSelector((s) => s.auth?.addresses || []);
  const currentLocation = useSelector((s) => s.location?.currentLocation);
  const insets = useSafeAreaInsets();
  const mapRef = useRef(null);

  const [region, setRegion] = useState({
    latitude: 48.5469,
    longitude: 22.9863,
    latitudeDelta: 0.005,
    longitudeDelta: 0.005,
  });
  const [zones, setZones] = useState([]);
  const [activeZone, setActiveZone] = useState(null);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [zonesError, setZonesError] = useState(false);
  const hasFallback = zonesError || zones.length === 0;

  // Fetch Delivery Zones
  useEffect(() => {
    (async () => {
      try {
        const res = await getDeliveryZones();
        const items = res?.data || res || [];
        setZones(items);
        
        // Check initial zone
        setRegion(current => {
          const initialZone = getZoneForLocation(
            { latitude: current.latitude, longitude: current.longitude },
            items
          );
          setActiveZone(initialZone);
          return current;
        });
      } catch (err) {
        console.error('[location-picker] Failed to fetch delivery zones:', err);
        setZonesError(true);
      } finally {
        setZonesLoading(false);
      }
    })();
  }, []);
  const [detectedStreet, setDetectedStreet] = useState('Завантаження вулиці...');
  const [mapType, setMapType] = useState('standard');
  const [addressType, setAddressType] = useState('apartment');
  const [houseNumber, setHouseNumber] = useState('');
  const [entrance, setEntrance] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isKeyboardActive, setIsKeyboardActive] = useState(false);

  const panY = useRef(new Animated.Value(320)).current; // Start collapsed
  const lastPanY = useRef(320);
  const isDraggingMap = useRef(false);
  const MAX_DOWN = 320; // Position for collapsed state

  const activeScale = useRef(new Animated.Value(1)).current;
  const touchStartTime = useRef(0);

  const keyboardOffset = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const listenerId = panY.addListener(({ value }) => {
      lastPanY.current = value;
    });
    return () => panY.removeListener(listenerId);
  }, []);

  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setIsKeyboardActive(true);
        Animated.timing(keyboardOffset, {
          toValue: Platform.OS === 'ios' ? (e.endCoordinates.height - insets.bottom + 6) : 0,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start();

        // Automatically expand sheet when keyboard appears
        Animated.spring(panY, {
          toValue: 0,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        }).start();
      }
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      (e) => {
        setIsKeyboardActive(false);
        Animated.timing(keyboardOffset, {
          toValue: 0,
          duration: Platform.OS === 'ios' ? e.duration || 250 : 200,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      show.remove();
      hide.remove();
    };
  }, [keyboardOffset, insets.bottom]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
         return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        touchStartTime.current = Date.now();
        panY.setOffset(lastPanY.current);
        panY.setValue(0);
        Animated.spring(activeScale, { toValue: 1.35, friction: 8, tension: 60, useNativeDriver: true }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dy: panY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();

        const duration = Date.now() - touchStartTime.current;
        const distance = Math.abs(gestureState.dy);

        if (duration < 250 && distance < 7) {
          toggleSheet();
        } else {
          if (gestureState.vy > 0.5 || gestureState.dy > 100) {
            Animated.spring(panY, {
              toValue: MAX_DOWN,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }).start();
          } else {
            Animated.spring(panY, {
              toValue: 0,
              friction: 8,
              tension: 40,
              useNativeDriver: true,
            }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
      }
    })
  ).current;

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setDetectedStreet('Немає дозволу на геолокацію');
          return;
        }
        setHasLocationPermission(true);
        // 1. Show last known position instantly for immediate map center
        const lastKnown = await Location.getLastKnownPositionAsync();
        if (lastKnown) {
          setRegion((prev) => ({
            ...prev,
            latitude: lastKnown.coords.latitude,
            longitude: lastKnown.coords.longitude,
          }));
        }
        // 2. Get accurate position in background
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setRegion((prev) => ({
          ...prev,
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        }));
      } catch (e) {
        console.warn('[location-picker] location init error:', e);
      }
    })();
  }, []);

  const onMapPanDrag = () => {
    if (!isDraggingMap.current) {
      isDraggingMap.current = true;
      // Slightly more hidden when dragging
      Animated.timing(panY, {
        toValue: MAX_DOWN + 50,
        duration: 150,
        useNativeDriver: true,
      }).start();
    }
  };

  const onRegionChangeComplete = async (newRegion) => {
    isDraggingMap.current = false;
    setRegion(newRegion);
    
    // Only snap back to COLLAPSED if we were "sinking" (dragging map) 
    // or if it was partially moved. Don't jump if it's already open or collapsed.
    if (lastPanY.current > MAX_DOWN || (lastPanY.current > 50 && lastPanY.current < MAX_DOWN)) {
      Animated.spring(panY, {
        toValue: MAX_DOWN,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    }

    // Determine delivery zone
    const resolvedZone = getZoneForLocation(
      { latitude: newRegion.latitude, longitude: newRegion.longitude },
      zones
    );
    setActiveZone(resolvedZone);

    try {
      const results = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude,
      });
      if (results.length > 0) {
        const addr = results[0];
        const street = addr.street || '';
        const city = addr.city || addr.district || '';
        const text = [street, city].filter(Boolean).join(', ');
        setDetectedStreet(text || 'Невідома вулиця');
      } else {
        setDetectedStreet('Невідома вулиця');
      }
    } catch {
      setDetectedStreet('Не вдалося визначити адресу');
    }
  };

  const toggleSheet = () => {
    // If it's mostly open, collapse it. Otherwise, open it.
    const target = lastPanY.current < 100 ? MAX_DOWN : 0;
    Animated.spring(panY, {
      toValue: target,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const toggleMapType = () =>
    setMapType((cur) => (cur === 'standard' ? 'hybrid' : 'standard'));

  const validateInputs = () => {
    if (!houseNumber.trim()) {
      Alert.alert('Помилка', 'Введіть номер будинку');
      return false;
    }
    if (addressType === 'apartment') {
      if (!entrance.trim() || !apartmentNumber.trim()) {
        Alert.alert('Помилка', "Введіть номер під'їзду та квартири");
        return false;
      }
    }
    return true;
  };

  const handleSaveLocation = async () => {
    if (!validateInputs()) return;
    if (!activeZone && !hasFallback) {
      Alert.alert('Помилка', 'Вибрана адреса знаходиться поза зоною доставки.');
      return;
    }

    if (savedAddresses.length >= 10) {
      Alert.alert(
        'Обмеження',
        'Ви досягли максимальної кількості збережених адрес (10). Будь ласка, видаліть деякі адреси перед додаванням нових.'
      );
      return;
    }

    const isDuplicate = savedAddresses.some((addr) => {
      const isSameHouse = addr.house === houseNumber.trim();
      const isSameApt = (addr.apartment || '') === (addressType === 'apartment' ? apartmentNumber.trim() : '');
      const isSameLocation =
        Math.abs(addr.latitude - region.latitude) < 0.001 &&
        Math.abs(addr.longitude - region.longitude) < 0.001;
      return isSameHouse && isSameApt && isSameLocation;
    });

    if (isDuplicate) {
      Alert.alert('Увага', 'Ця адреса вже збережена.');
      return;
    }

    setLoading(true);
    try {
      const nameLabel =
        addressType === 'apartment' ? 'Квартира 🏢' : 'Приватний дім 🏠';
      const addressString = `${detectedStreet}, буд. ${houseNumber}`;

      const apiPayload = {
        title: nameLabel,
        latitude: region.latitude,
        longitude: region.longitude,
        house: houseNumber.trim(),
        apartment: addressType === 'apartment' ? apartmentNumber.trim() : null,
        entrance: addressType === 'apartment' ? entrance.trim() : null,
        floor: null,
        comment: null,
        is_default: true,
      };

      await createAddress(apiPayload);
      await dispatch(fetchAddresses()).unwrap();
      dispatch(
        setCurrentLocation({
          latitude: apiPayload.latitude,
          longitude: apiPayload.longitude,
          addressName: addressString,
        })
      );
      // Save custom delivery price to Cart store
      dispatch(setCustomDeliveryFee(activeZone ? activeZone.price : null));

      Alert.alert('Успіх', 'Адресу збережено!', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err) {
      console.error('[location-picker] createAddress error:', err);
      Alert.alert('Помилка', err?.message || 'Не вдалося зберегти адресу');
    } finally {
      setLoading(false);
    }
  };

  const handleUseOnce = () => {
    if (!validateInputs()) return;
    if (!activeZone && !hasFallback) {
      Alert.alert('Помилка', 'Вибрана адреса знаходиться поза зоною доставки.');
      return;
    }

    let details = `буд. ${houseNumber}`;
    if (addressType === 'apartment') {
      details += `, під'їзд ${entrance}, кв. ${apartmentNumber}`;
    }
    const addressName = `${detectedStreet}, ${details}`;

    dispatch(
      setCurrentLocation({
        latitude: region.latitude,
        longitude: region.longitude,
        addressName,
      })
    );
    // Save custom delivery price to Cart store
    dispatch(setCustomDeliveryFee(activeZone ? activeZone.price : null));
    router.back();
  };

  // Padding for footer: safe area bottom + buttons gap
  const footerPaddingBottom = Math.max(insets.bottom, 16) + 8;

  return (
    <View style={styles.root}>
      {/* MAP LAYER */}
      <MapView
        ref={mapRef}
        provider={Platform.OS === 'android' ? PROVIDER_GOOGLE : undefined}
        style={StyleSheet.absoluteFillObject}
        region={region}
        mapType={mapType}
        onPanDrag={onMapPanDrag}
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
      >
        {/* Draw Delivery Zone Polygons */}
        {zones.map((zone, idx) => {
          const colors = getZoneColor(zone);
          const coords = (zone.points || []).map((p) => ({
            latitude: p.lat,
            longitude: p.lng,
          }));
          return (
            <Polygon
              key={`zone-${idx}`}
              coordinates={coords}
              fillColor={colors.fill}
              strokeColor={colors.stroke}
              strokeWidth={2}
            />
          );
        })}

        {savedAddresses.map((addr, idx) => {
          const isSelected = currentLocation && 
            (Math.abs(addr.latitude - currentLocation.latitude) < 0.0001 && Math.abs(addr.longitude - currentLocation.longitude) < 0.0001);
          return (
            <Marker
              key={addr.id || idx}
              coordinate={{ latitude: addr.latitude, longitude: addr.longitude }}
              title={addr.title}
              description={addr.address}
              onPress={() => {
                dispatch(setCurrentLocation({
                  latitude: addr.latitude,
                  longitude: addr.longitude,
                  addressName: addr.address,
                }));
              }}
            >
              <View style={[
                styles.mapMarker, { borderColor: theme.primary },
                isSelected && [styles.mapMarkerSelected, { backgroundColor: theme.primary }]
              ]}>
                <Ionicons 
                  name={addr.title?.includes('Квартира') ? 'business' : 'home'} 
                  size={isSelected ? 24 : 16} 
                  color={isSelected ? "white" : theme.primary} 
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* FIXED MARKER PIN (always shows what you are pointing at) */}
      {!isKeyboardActive && (
        <View style={styles.markerFixed} pointerEvents="none">
          <Ionicons name="location" size={40} color={theme.primary} />
        </View>
      )}

      {/* TOP BUTTONS — positioned using insets.top so they won't rely on SafeAreaView */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <View style={styles.roundBtnWrapper}>
          <BackButton color="black" />
        </View>

        <TouchableOpacity style={styles.roundBtn} onPress={toggleMapType}>
          <Ionicons
            name={mapType === 'standard' ? 'globe-outline' : 'map-outline'}
            size={24}
            color="black"
          />
        </TouchableOpacity>
      </View>

      {/* DRAGGABLE BOTTOM SHEET */}
      <Animated.View 
        style={[
          styles.footer, 
          { 
            paddingBottom: footerPaddingBottom,
            transform: [{
              translateY: Animated.subtract(
                panY.interpolate({
                  inputRange: [0, MAX_DOWN, MAX_DOWN + 100],
                  outputRange: [0, MAX_DOWN, MAX_DOWN + 100],
                  extrapolate: 'clamp'
                }),
                keyboardOffset
              )
            }] 
          }
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragHeader}>
          <View style={styles.pillContainer}>
            <Animated.View 
              style={[
                styles.pill,
                {
                  transform: [
                    { scaleX: activeScale },
                    { scaleY: activeScale }
                  ]
                }
              ]} 
            />
          </View>

          {/* ZONE INFO BAR */}
          <View style={styles.zoneInfoBar}>
            {zonesLoading ? (
              <Text style={styles.zoneInfoTextLoading}>Визначення зони доставки...</Text>
            ) : activeZone ? (
              <View style={[styles.zoneBadge, { backgroundColor: getZoneColor(activeZone).fill, borderColor: getZoneColor(activeZone).stroke }]}>
                <Text style={[styles.zoneBadgeText, { color: getZoneColor(activeZone).text }]}>
                  {getZoneColor(activeZone).displayName} • Доставка {activeZone.price} ₴
                </Text>
              </View>
            ) : hasFallback ? (
              <View style={[styles.zoneBadge, { backgroundColor: 'rgba(33, 150, 243, 0.1)', borderColor: '#2196F3' }]}>
                <Text style={[styles.zoneBadgeText, { color: '#1E88E5' }]}>
                  Стандартний тариф • Доставка 50 ₴
                </Text>
              </View>
            ) : (
              <View style={styles.zoneBadgeError}>
                <Ionicons name="warning" size={14} color="#D32F2F" style={{ marginRight: 4 }} />
                <Text style={styles.zoneBadgeTextError}>
                  Доставка недоступна за цією адресою 🚫
                </Text>
              </View>
            )}
          </View>

          {/* STREET ROW */}
          <View style={styles.addressRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons
                  name="location"
                  size={18}
                  color={theme.primary}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.detectedText} numberOfLines={1}>
                  {detectedStreet}
                </Text>
              </View>
            </View>
            
            <TouchableOpacity
              style={[
                styles.headerConfirmBtn,
                { backgroundColor: (activeZone || hasFallback) ? theme.primary : '#E0E0E0' }
              ]}
              onPress={handleUseOnce}
              disabled={loading || (!activeZone && !hasFallback)}
            >
              <Text style={[styles.headerConfirmBtnText, { color: (activeZone || hasFallback) ? 'white' : '#888' }]}>Вибрати</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          contentContainerStyle={{ paddingBottom: 20 }}
        >
          {/* TOGGLE */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleBtn,
                addressType === 'apartment' && styles.toggleActive,
              ]}
              onPress={() => setAddressType('apartment')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  addressType === 'apartment' && styles.toggleTextActive,
                ]}
              >
                Квартира
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.toggleBtn,
                addressType === 'house' && styles.toggleActive,
              ]}
              onPress={() => setAddressType('house')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.toggleText,
                  addressType === 'house' && styles.toggleTextActive,
                ]}
              >
                Приватний дім
              </Text>
            </TouchableOpacity>
          </View>

          {/* INPUTS */}
          <View style={styles.inputsContainer}>
            <View
              style={[
                styles.inputGroup,
                addressType === 'house' && { flex: 1 },
              ]}
            >
              <Text style={styles.label}>Будинок</Text>
              <TextInput
                style={styles.input}
                placeholder="№"
                placeholderTextColor="#ccc"
                keyboardType="numeric"
                value={houseNumber}
                onChangeText={setHouseNumber}
                returnKeyType="done"
              />
            </View>

            {addressType === 'apartment' && (
              <>
                <View style={[styles.inputGroup, { marginLeft: 10 }]}>
                  <Text style={styles.label}>Під'їзд</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="№"
                    placeholderTextColor="#ccc"
                    keyboardType="numeric"
                    value={entrance}
                    onChangeText={setEntrance}
                    returnKeyType="done"
                  />
                </View>
                <View style={[styles.inputGroup, { marginLeft: 10 }]}>
                  <Text style={styles.label}>Квартира</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="№"
                    placeholderTextColor="#ccc"
                    keyboardType="numeric"
                    value={apartmentNumber}
                    onChangeText={setApartmentNumber}
                    returnKeyType="done"
                  />
                </View>
              </>
            )}
          </View>

          {/* SAVE BUTTONS */}
          <TouchableOpacity
            style={[
              styles.btnSave,
              (loading || (!activeZone && !hasFallback)) && { opacity: 0.5, backgroundColor: '#888' }
            ]}
            onPress={handleSaveLocation}
            disabled={loading || (!activeZone && !hasFallback)}
          >
            <Text style={styles.btnText}>
              {loading ? 'Збереження...' : '💾 Зберегти адресу'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#fff',
  },
  map: {
    flex: 1,
  },
  markerFixed: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -20,
    marginTop: -40,
    zIndex: 10,
  },
  mapMarker: {
    backgroundColor: 'white',
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: '#000000',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  mapMarkerSelected: {
    backgroundColor: '#000000',
    borderColor: 'white',
    padding: 8,
    borderWidth: 3,
  },

  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
  },
  roundBtnWrapper: {
    backgroundColor: 'white',
    borderRadius: 22,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },
  roundBtn: {
    backgroundColor: 'white',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 3,
  },

  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 8,
    paddingHorizontal: 20,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: -5 },
    shadowRadius: 10,
    zIndex: 50,
  },
  pillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    marginHorizontal: -20,
    backgroundColor: 'transparent',
  },
  pill: {
    width: 48,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C6C6CC',
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detectedText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
    fontWeight: '700',
  },
  headerConfirmBtn: {
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginLeft: 12,
  },
  headerConfirmBtnText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },

  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f2f2f2',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  toggleActive: {
    backgroundColor: 'white',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: 'black' },

  inputsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  inputGroup: { flex: 1 },
  label: {
    fontSize: 12,
    color: 'gray',
    marginBottom: 6,
    fontWeight: '600',
    marginLeft: 4,
  },
  input: {
    backgroundColor: '#f9f9f9',
    height: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#eee',
    color: 'black',
    textAlign: 'center',
    paddingVertical: 0,
    textAlignVertical: 'center'
  },

  btnSave: {
    width: '100%',
    backgroundColor: '#000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnOnce: {
    width: '100%',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#000000',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOnceText: { color: '#000000', fontWeight: 'bold', fontSize: 16 },
  dragHeader: {
    backgroundColor: 'transparent',
  },
  zoneInfoBar: {
    marginBottom: 12,
    alignItems: 'center',
    width: '100%',
  },
  zoneBadge: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    width: '100%',
    alignItems: 'center',
  },
  zoneBadgeText: {
    fontSize: 13,
    fontWeight: '700',
  },
  zoneBadgeError: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(244, 67, 54, 0.08)',
    borderColor: 'rgba(244, 67, 54, 0.3)',
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    width: '100%',
  },
  zoneBadgeTextError: {
    color: '#D32F2F',
    fontSize: 13,
    fontWeight: '700',
  },
  zoneInfoTextLoading: {
    color: '#888',
    fontSize: 12,
    fontWeight: '600',
  }
});