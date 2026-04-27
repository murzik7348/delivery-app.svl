import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
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
  PanResponder
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE, Marker } from 'react-native-maps';
import { useDispatch, useSelector } from 'react-redux';
import { setCurrentLocation } from '../store/locationSlice';
import { fetchAddresses } from '../store/authSlice';
import { createAddress } from '../src/api';
import BackButton from '../components/BackButton';

export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
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
  const [detectedStreet, setDetectedStreet] = useState('Завантаження вулиці...');
  const [mapType, setMapType] = useState('standard');
  const [addressType, setAddressType] = useState('apartment');
  const [houseNumber, setHouseNumber] = useState('');
  const [entrance, setEntrance] = useState('');
  const [apartmentNumber, setApartmentNumber] = useState('');
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [loading, setLoading] = useState(false);

  const panY = useRef(new Animated.Value(0)).current;
  const lastPanY = useRef(0);
  const isDraggingMap = useRef(false);
  const MAX_DOWN = 280; // Distance to slide down when moving map

  useEffect(() => {
    const listenerId = panY.addListener(({ value }) => {
      lastPanY.current = value;
    });
    return () => panY.removeListener(listenerId);
  }, []);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
         return Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.setOffset(lastPanY.current);
        panY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: panY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
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
      },
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
      Animated.timing(panY, {
        toValue: MAX_DOWN,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  };

  const onRegionChangeComplete = async (newRegion) => {
    isDraggingMap.current = false;
    setRegion(newRegion);
    
    // Slide sheet back up
    Animated.spring(panY, {
      toValue: 0,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();

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
    router.back();
  };

  const toggleSheet = () => {
    const isClosed = lastPanY.current > MAX_DOWN / 2;
    Animated.spring(panY, {
      toValue: isClosed ? 0 : MAX_DOWN,
      friction: 8,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Padding for footer: safe area bottom + buttons gap
  const footerPaddingBottom = Math.max(insets.bottom, 16) + 8;

  return (
    <KeyboardAvoidingView 
      style={styles.root} 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
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
                styles.mapMarker,
                isSelected && styles.mapMarkerSelected
              ]}>
                <Ionicons 
                  name={addr.title?.includes('Квартира') ? 'business' : 'home'} 
                  size={isSelected ? 24 : 16} 
                  color={isSelected ? "white" : "#e334e3"} 
                />
              </View>
            </Marker>
          );
        })}
      </MapView>

      {/* FIXED MARKER PIN (always shows what you are pointing at) */}
      <View style={styles.markerFixed} pointerEvents="none">
        <Ionicons name="location" size={40} color="#e334e3" />
      </View>

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
              translateY: panY.interpolate({
                inputRange: [0, MAX_DOWN],
                outputRange: [0, MAX_DOWN],
                extrapolate: 'clamp'
              })
            }] 
          }
        ]}
      >
        <View {...panResponder.panHandlers} style={styles.dragHeader}>
          <TouchableOpacity 
            style={styles.pillContainer} 
            onPress={toggleSheet} 
            activeOpacity={0.7}
            hitSlop={{ top: 15, bottom: 15, left: 50, right: 50 }}
          >
            <View style={styles.pill} />
          </TouchableOpacity>

          {/* STREET ROW */}
          <View style={styles.addressRow}>
            <Ionicons
              name="location"
              size={18}
              color="#e334e3"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.detectedText} numberOfLines={2}>
              {detectedStreet}
            </Text>
          </View>
        </View>

        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
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
            style={[styles.btnSave, loading && { opacity: 0.6 }]}
            onPress={handleSaveLocation}
            disabled={loading}
          >
            <Text style={styles.btnText}>
              {loading ? 'Збереження...' : '💾 Зберегти адресу'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.btnOnce}
            onPress={handleUseOnce}
            disabled={loading}
          >
            <Text style={styles.btnOnceText}>
              🚀 Використати цю вулицю (1 раз)
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </Animated.View>
    </KeyboardAvoidingView>
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
    borderColor: '#e334e3',
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
  },
  mapMarkerSelected: {
    backgroundColor: '#e334e3',
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
  },
  pillContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    marginBottom: 8,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 3,
    backgroundColor: '#E0E0E0',
  },

  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  detectedText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: 'bold',
    textAlign: 'center',
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
    borderColor: '#e334e3',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnOnceText: { color: '#e334e3', fontWeight: 'bold', fontSize: 16 },
  dragHeader: {
    backgroundColor: 'transparent',
  }
});