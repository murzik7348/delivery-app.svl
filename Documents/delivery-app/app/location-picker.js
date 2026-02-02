import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-maps';
import { useDispatch } from 'react-redux';
import { saveAddress, setCurrentLocation } from '../store/locationSlice';

export default function LocationPickerScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const [region, setRegion] = useState({
    latitude: 50.4501, longitude: 30.5234, latitudeDelta: 0.005, longitudeDelta: 0.005,
  });
  
  const [addressLabel, setAddressLabel] = useState('');
  const [detectedStreet, setDetectedStreet] = useState('Завантаження вулиці...');
  const [mapType, setMapType] = useState('standard');

  const onRegionChangeComplete = async (newRegion) => {
    setRegion(newRegion);
    try {
      let addressResponse = await Location.reverseGeocodeAsync({
        latitude: newRegion.latitude,
        longitude: newRegion.longitude
      });

      if (addressResponse.length > 0) {
        const addr = addressResponse[0];
        const streetText = `${addr.street || ''} ${addr.streetNumber || ''}, ${addr.city || ''}`;
        setDetectedStreet(streetText.trim() || 'Невідома вулиця');
      }
    } catch (error) {
      setDetectedStreet('Не вдалося визначити адресу');
    }
  };

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      let location = await Location.getCurrentPositionAsync({});
      setRegion({ ...region, latitude: location.coords.latitude, longitude: location.coords.longitude });
    })();
  }, []);

  const handleSaveLocation = () => {
    if (!addressLabel.trim()) {
      Alert.alert('Увага', 'Введіть назву для цієї точки (наприклад: Дім)');
      return;
    }
    const newPlace = {
      id: Date.now(),
      latitude: region.latitude,
      longitude: region.longitude,
      name: addressLabel,
      address: detectedStreet
    };
    dispatch(setCurrentLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      addressName: addressLabel 
    }));
    dispatch(saveAddress(newPlace));
    router.back();
  };

  const handleUseOnce = () => {
    dispatch(setCurrentLocation({
      latitude: region.latitude,
      longitude: region.longitude,
      addressName: detectedStreet
    }));
    router.back();
  };

  const toggleMapType = () => {
    setMapType(current => current === 'standard' ? 'hybrid' : 'standard');
  };

  return (
    // 👇 ГОЛОВНА ЗМІНА: KeyboardAvoidingView
    <KeyboardAvoidingView 
      style={{ flex: 1 }} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20} // Піднімає трохи вище на Android
    >
      <View style={styles.container}>
        <MapView 
          style={styles.map} 
          region={region} 
          mapType={mapType}
          onRegionChangeComplete={onRegionChangeComplete} 
          showsUserLocation={true} 
        />
        
        {/* Кнопки поверх карти */}
        <TouchableOpacity style={styles.layerBtn} onPress={toggleMapType}>
          <Ionicons name={mapType === 'standard' ? 'globe-outline' : 'map-outline'} size={28} color="black" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
           <Ionicons name="arrow-back" size={24} color="black" />
        </TouchableOpacity>

        <View style={styles.markerFixed}>
          <Ionicons name="location" size={40} color="#e334e3" />
        </View>

        {/* НИЖНЯ ПАНЕЛЬ */}
        <View style={styles.footer}>
          <Text style={styles.detectedText}>📍 {detectedStreet}</Text>
          
          <TextInput
            style={styles.input}
            placeholder="Назвіть це місце (Дім, Офіс...)"
            value={addressLabel}
            onChangeText={setAddressLabel}
            // 👇 Додаємо кнопку 'Done' на клавіатурі
            returnKeyType="done"
          />

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
  map: { flex: 1 }, // Карта тепер займає весь простір, що лишився
  markerFixed: { position: 'absolute', top: '50%', left: '50%', marginLeft: -20, marginTop: -40, zIndex: 10 },
  
  layerBtn: {
    position: 'absolute', top: 60, right: 20,
    backgroundColor: 'white', width: 50, height: 50, borderRadius: 25,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: '#000', shadowOpacity: 0.3, elevation: 5, zIndex: 20
  },

  backBtn: {
    position: 'absolute', top: 60, left: 20,
    backgroundColor: 'white', width: 40, height: 40, borderRadius: 20,
    justifyContent: 'center', alignItems: 'center', elevation: 5, zIndex: 20
  },

  footer: {
    backgroundColor: 'white', 
    borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, alignItems: 'center', 
    shadowOpacity: 0.2, elevation: 10,
    // 👇 Важливо: footer тепер просто знизу контейнера, не absolute
    width: '100%' 
  },
  detectedText: { fontSize: 14, color: '#666', marginBottom: 10, fontWeight: '600', textAlign: 'center' },
  input: { width: '100%', backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, marginBottom: 10, fontSize: 16 },
  btnSave: { width: '100%', backgroundColor: '#000', padding: 16, borderRadius: 12, alignItems: 'center', marginBottom: 10 },
  btnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  btnOnce: { width: '100%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e334e3', padding: 16, borderRadius: 12, alignItems: 'center' },
  btnOnceText: { color: '#e334e3', fontWeight: 'bold', fontSize: 16 }
});