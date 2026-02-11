import React from 'react';
import { Modal, View, Text, TouchableOpacity, StyleSheet, FlatList, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { removeAddress } from '../store/locationSlice';
import { useRouter } from 'expo-router';

export default function AddressBottomSheet({ visible, onClose }) {
  const dispatch = useDispatch();
  const router = useRouter();
  const savedAddresses = useSelector((state) => state.location.savedAddresses);

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      {/* Затемнений фон (при кліку закриває шторку) */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          
          {/* БІЛА ШТОРКА (клік по ній не закриває) */}
          <TouchableWithoutFeedback>
            <View style={styles.sheetContainer}>
              
              {/* ЗАГОЛОВОК І ХРЕСТИК */}
              <View style={styles.header}>
                <Text style={styles.title}>Мої адреси 🏠</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color="#ccc" />
                </TouchableOpacity>
              </View>

              {/* СПИСОК АДРЕС */}
              <FlatList
                data={savedAddresses}
                keyExtractor={(item) => item.id.toString()}
                contentContainerStyle={{ paddingBottom: 20 }}
                ListEmptyComponent={
                  <Text style={{ textAlign: 'center', color: 'gray', marginTop: 20 }}>
                    Немає адрес
                  </Text>
                }
                renderItem={({ item }) => (
                  <View style={styles.addressItem}>
                    {/* Іконка в кружечку */}
                    <View style={styles.iconCircle}>
                      <Ionicons name="location-sharp" size={24} color="#e334e3" />
                    </View>
                    
                    {/* Текст */}
                    <View style={{ flex: 1 }}>
                      <Text style={styles.addrName}>{item.name}</Text>
                      <Text style={styles.addrText} numberOfLines={1}>{item.address}</Text>
                    </View>

                    {/* Смітник */}
                    <TouchableOpacity onPress={() => dispatch(removeAddress(item.id))} style={styles.trashBtn}>
                      <Ionicons name="trash-outline" size={22} color="#ff3b30" />
                    </TouchableOpacity>
                  </View>
                )}
              />

              {/* ЧОРНА КНОПКА */}
              <TouchableOpacity 
                style={styles.addButton} 
                onPress={() => {
                  onClose(); // Закриваємо шторку
                  router.push('/location-picker'); // Йдемо на карту
                }}
              >
                <Ionicons name="add" size={24} color="white" style={{ marginRight: 8 }} />
                <Text style={styles.addButtonText}>Додати нову адресу</Text>
              </TouchableOpacity>
              
              {/* Відступ знизу для iPhone */}
              <View style={{ height: 20 }} />

            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)', // Затемнення
    justifyContent: 'flex-end', // Притискаємо до низу
  },
  sheetContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: '80%', // Шторка не на весь екран
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: 'black',
  },
  closeBtn: {
    padding: 5,
    backgroundColor: '#f2f2f2',
    borderRadius: 15,
  },
  
  // Стилі списку
  addressItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 15,
  },
  iconCircle: {
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 2, borderColor: '#2d0a30',
    justifyContent: 'center', alignItems: 'center',
    marginRight: 15,
  },
  addrName: { fontSize: 17, fontWeight: 'bold', color: 'black' },
  addrText: { fontSize: 14, color: 'gray', marginTop: 2 },
  trashBtn: { padding: 10, backgroundColor: '#fff5f5', borderRadius: 10 },

  // Кнопка
  addButton: {
    backgroundColor: 'black',
    borderRadius: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  addButtonText: { color: 'white', fontSize: 16, fontWeight: 'bold' },
});