import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView from 'react-native-maps';
import { useDispatch } from 'react-redux';
import { addAddress, setCurrentLocation } from '../store/locationSlice';

export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
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
  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setDetectedStreet('Немає дозволу на геолокацію');
        return;
      }
      let location = await Location.getCurrentPositionAsync({});
      setRegion({ 
        ...region, 
        latitude: location.coords.latitude, 
        longitude: location.coords.longitude 
      });
    })();
  }, []);
  const onRegionChangeComplete = async (newRegion) => {
    setRegion(newRegion);
    try {
      let addressResponse = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude
      });

      if (addressResponse.length > 0) {
        const addr = addressResponse[0];
        const streetText = `${addr.street || ''}, ${addr.city || ''}`;
        setDetectedStreet(streetText.trim() === ',' ? 'Невідома вулиця' : streetText.trim());
      }
    } catch (error) {
      setDetectedStreet('Не вдалося визначити адресу');
    }
  };
  const toggleMapType = () => {
    setMapType(current => current === 'standard' ? 'hybrid' : 'standard');
  };
  const validateInputs = () => {
    if (!houseNumber.trim()) {
      Alert.alert('Помилка', 'Введіть номер будинку');
      return false;
    }
    if (addressType === 'apartment') {
      if (!entrance.trim() || !apartmentNumber.trim()) {
        Alert.alert('Помилка', 'Введіть номер під\'їзду та квартири');
        return false;
      }
    }
    return true;
  };
  const getFullAddressInfo = () => {
    let details = `буд. ${houseNumber}`;
    if (addressType === 'apartment') {
      details += `, під'їзд ${entrance}, кв. ${apartmentNumber}`;
    }
    
    const finalAddressString = `${detectedStreet}, ${details}`;
    const nameLabel = addressType === 'apartment' ? 'Квартира 🏢' : 'Приватний дім 🏠';

    return {
      id: Date.now(),
      latitude: region.latitude,
      longitude: region.longitude,
      name: nameLabel,
      address: finalAddressString
    };
  };
  const handleSaveLocation = () => {
    if (validateInputs()) {
      const newPlace = getFullAddressInfo();
      dispatch(setCurrentLocation({
        latitude: newPlace.latitude,
        longitude: newPlace.longitude,
        addressName: newPlace.address 
      }));
      dispatch(addAddress(newPlace)); 
      router.back();
    }
  };
  const handleUseOnce = () => {
    if (validateInputs()) {
      const tempAddress = getFullAddressInfo();
      
      dispatch(setCurrentLocation({
        latitude: tempAddress.latitude,
        longitude: tempAddress.longitude,
        addressName: tempAddress.address
      }));
      
      router.back();
    }
  };

  return (
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <View style={styles.container}>
        
        {/* КАРТА */}
        <MapView 
          style={styles.map} 
          region={region} 
          mapType={mapType}
          onRegionChangeComplete={onRegionChangeComplete} 
          showsUserLocation={true} 
        />
        
        {/* Фейковий маркер по центру */}
        <View style={styles.markerFixed}>
          <Ionicons name="location" size={40} color="#e334e3" />
        </View>

        {/* Кнопка зміни карти */}
        <SafeAreaView style={styles.layerBtnContainer} pointerEvents="box-none">
           <TouchableOpacity style={styles.layerBtn} onPress={toggleMapType}>
            <Ionicons name={mapType === 'standard' ? 'globe-outline' : 'map-outline'} size={28} color="black" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* Кнопка НАЗАД */}
        <SafeAreaView style={styles.topArea} pointerEvents="box-none">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
             <Ionicons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
        </SafeAreaView>

        {/* === НИЖНЯ ПАНЕЛЬ (ШТОРКА) === */}
        <View style={styles.footer}>
          
          {/* Визначена вулиця */}
          <View style={styles.addressRow}>
            <Ionicons name="location" size={18} color="#900" style={{ marginRight: 8 }} />
            <Text style={styles.detectedText}>{detectedStreet}</Text>
          </View>
          
          {/* ТУМБЛЕР */}
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[styles.toggleBtn, addressType === 'apartment' && styles.toggleActive]}
              onPress={() => setAddressType('apartment')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, addressType === 'apartment' && styles.toggleTextActive]}>
                Квартира
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.toggleBtn, addressType === 'house' && styles.toggleActive]}
              onPress={() => setAddressType('house')}
              activeOpacity={0.8}
            >
              <Text style={[styles.toggleText, addressType === 'house' && styles.toggleTextActive]}>
                Приватний дім
              </Text>
            </TouchableOpacity>
          </View>

          {/* ДИНАМІЧНІ ПОЛЯ ВВОДУ */}
          <View style={styles.inputsContainer}>
            {/* Будинок (завжди) */}
            <View style={[styles.inputGroup, addressType === 'house' && { flex: 1 }]}>
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

            {/* Під'їзд і Квартира (тільки для квартири) */}
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

          {/* КНОПКИ ЗБЕРЕЖЕННЯ */}
          <TouchableOpacity style={styles.btnSave} onPress={handleSaveLocation}>
            <Text style={styles.btnText}>💾 Зберегти адресу</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.btnOnce} onPress={handleUseOnce}>
            <Text style={styles.btnOnceText}>🚀 Використати цю вулицю (1 раз)</Text>
          </TouchableOpacity>
          
        </View>

      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, zIndex: 10 },
  
  layerBtnContainer: { position: 'absolute', top: 0, right: 0, paddingRight: 20, paddingTop: 10 },
  layerBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, elevation: 5 },

  topArea: { position: 'absolute', top: 0, left: 0, paddingHorizontal: 16, paddingTop: 10 },
  backBtn: { backgroundColor: 'white', width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowOffset: { width: 0, height: 2 }, elevation: 5 },

  footer: { 
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, 
    borderTopRightRadius: 24, 
    padding: 24, 
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: -3 },
    elevation: 10
  },
  
  addressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  detectedText: { fontSize: 16, color: '#333', fontWeight: 'bold', textAlign: 'center' },

  toggleContainer: { flexDirection: 'row', backgroundColor: '#f2f2f2', borderRadius: 12, padding: 4, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 12, justifyContent: 'center', alignItems: 'center', borderRadius: 8 },
  toggleActive: { backgroundColor: 'white', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  toggleText: { fontSize: 15, fontWeight: '600', color: '#888' },
  toggleTextActive: { color: 'black' },

  inputsContainer: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  inputGroup: { flex: 1 },
  label: { fontSize: 12, color: 'gray', marginBottom: 6, fontWeight: '600', marginLeft: 4 },
  input: { backgroundColor: '#f9f9f9', height: 48, borderRadius: 12, paddingHorizontal: 12, fontSize: 16, borderWidth: 1, borderColor: '#eee', color: 'black', textAlign: 'center' },

  btnSave: { width: '100%', backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnOnce: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e334e3', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnOnceText: { color: '#e334e3', fontWeight: 'bold', fontSize: 16 }
});