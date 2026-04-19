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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useDispatch } from 'react-redux';
import { setCurrentLocation } from '../store/locationSlice';
import { fetchAddresses } from '../store/authSlice';
import { createAddress } from '../src/api';
import { safeBack } from '../utils/navigation';

export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
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

  const onRegionChangeComplete = async (newRegion) => {
    setRegion(newRegion);
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
        { text: 'OK', onPress: () => safeBack(router) },
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
    safeBack(router);
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
        onRegionChangeComplete={onRegionChangeComplete}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
      />

      {/* FIXED MARKER PIN */}
      <View style={styles.markerFixed} pointerEvents="none">
        <Ionicons name="location" size={40} color="#e334e3" />
      </View>

      {/* TOP BUTTONS — positioned using insets.top so they won't rely on SafeAreaView */}
      <View style={[styles.topBar, { top: insets.top + 8 }]}>
        <TouchableOpacity style={styles.roundBtn} onPress={() => safeBack(router)}>
          <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.roundBtn} onPress={toggleMapType}>
          <Ionicons
            name={mapType === 'standard' ? 'globe-outline' : 'map-outline'}
            size={24}
            color="black"
          />
        </TouchableOpacity>
      </View>

      {/* BOTTOM SHEET */}
      <View style={[styles.footer, { paddingBottom: footerPaddingBottom }]}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* STREET ROW */}
          <View style={styles.addressRow}>
            <Ionicons
              name="location"
              size={18}
              color="#900"
              style={{ marginRight: 8 }}
            />
            <Text style={styles.detectedText} numberOfLines={2}>
              {detectedStreet}
            </Text>
          </View>

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
      </View>
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

  topBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 20,
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
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    width: '100%',
    elevation: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    shadowRadius: 6,
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
});