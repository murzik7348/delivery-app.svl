import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../constants/Colors';
import useCatalogFilter from '../hooks/useCatalogFilter';

export default function CatalogScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [modalVisible, setModalVisible] = useState(false);
  const { sortOrder, setSortOrder, finalProducts } = useCatalogFilter();

  const topProducts = finalProducts.slice(0, 5);
  const newProducts = finalProducts.slice(5, 10);
  const renderProductItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => router.push(`/restaurant/${item.store_id}`)}
    >
      <Image source={{ uri: item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardPrice, { color: theme.tint }]}>{item.price} грн</Text>
        <TouchableOpacity style={styles.addBtn}>
          <Ionicons name="add" size={20} color="white" />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ШАПКА + КНОПКА ПОШУКУ */}
      <View style={styles.headerContainer}>
        <Text style={[styles.pageTitle, { color: theme.text }]}>Каталог</Text>

        <View style={styles.searchRow}>
          {/* Натискання перекидає на search.js */}
          <TouchableOpacity
            style={[styles.searchBar, { backgroundColor: theme.input }]}
            onPress={() => router.push('/search')}
            activeOpacity={0.8}
          >
            <Ionicons name="search" size={20} color="gray" style={{ marginRight: 8 }} />
            <Text style={{ color: 'gray', fontSize: 16 }}>Пошук смачненького...</Text>
          </TouchableOpacity>

          {/* Кнопка Сортування */}
          <TouchableOpacity style={styles.sortButton} onPress={() => setModalVisible(true)}>
            <Ionicons name="options-outline" size={24} color="white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Секція: Топ сезону */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🔥 Топ сезону</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            {topProducts.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.horizontalCard, { backgroundColor: theme.card }]} onPress={() => router.push(`/restaurant/${item.store_id}`)}>
                <View style={styles.badgeTop}><Text style={styles.badgeText}>TOP</Text></View>
                <Image source={{ uri: item.image }} style={styles.horizontalImage} />
                <Text style={[styles.hCardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.hCardPrice, { color: theme.tint }]}>{item.price} грн</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Секція: Новинки */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>🆕 Новинки</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ paddingLeft: 16 }}>
            {newProducts.map((item, index) => (
              <TouchableOpacity key={index} style={[styles.horizontalCard, { backgroundColor: theme.card }]} onPress={() => router.push(`/restaurant/${item.store_id}`)}>
                <View style={[styles.badgeTop, { backgroundColor: '#4CAF50' }]}><Text style={styles.badgeText}>NEW</Text></View>
                <Image source={{ uri: item.image }} style={styles.horizontalImage} />
                <Text style={[styles.hCardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
                <Text style={[styles.hCardPrice, { color: theme.tint }]}>{item.price} грн</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Всі товари */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Всі товари</Text>
          <View style={styles.grid}>
            {finalProducts.map((item, index) => (
              <View key={index} style={{ width: '48%', marginBottom: 16 }}>
                {renderProductItem({ item })}
              </View>
            ))}
          </View>
        </View>

      </ScrollView>

      {/* Модалка Сортування */}
      <Modal animationType="slide" transparent={true} visible={modalVisible} onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Сортування</Text>

            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortOrder('asc'); setModalVisible(false); }}>
              <Ionicons name="arrow-up" size={20} color={theme.text} />
              <Text style={[styles.sortText, { color: theme.text }]}>Від дешевих до дорогих</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortOrder('desc'); setModalVisible(false); }}>
              <Ionicons name="arrow-down" size={20} color={theme.text} />
              <Text style={[styles.sortText, { color: theme.text }]}>Від дорогих до дешевих</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.sortOption} onPress={() => { setSortOrder(null); setModalVisible(false); }}>
              <Ionicons name="refresh" size={20} color={theme.text} />
              <Text style={[styles.sortText, { color: theme.text }]}>За замовчуванням</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.closeButton, { backgroundColor: '#e334e3' }]} onPress={() => setModalVisible(false)}>
              <Text style={styles.closeButtonText}>Закрити</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerContainer: { paddingHorizontal: 16, paddingVertical: 10 },
  pageTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  searchRow: { flexDirection: 'row', alignItems: 'center' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 12, paddingHorizontal: 12, marginRight: 10 },
  sortButton: { width: 46, height: 46, backgroundColor: '#e334e3', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },

  section: { marginTop: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 16, marginBottom: 10 },
  horizontalCard: { width: 140, marginRight: 15, borderRadius: 12, padding: 8, alignItems: 'center' },
  horizontalImage: { width: 120, height: 100, borderRadius: 10, marginBottom: 8 },
  hCardTitle: { fontSize: 14, fontWeight: '600', textAlign: 'center' },
  hCardPrice: { fontSize: 14, fontWeight: 'bold', marginTop: 4 },
  badgeTop: { position: 'absolute', top: 5, left: 5, zIndex: 1, backgroundColor: '#FF5722', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', paddingHorizontal: 16 },
  card: { borderRadius: 16, overflow: 'hidden', paddingBottom: 10 },
  cardImage: { width: '100%', height: 120 },
  cardContent: { padding: 10 },
  cardTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  cardPrice: { fontSize: 16, fontWeight: 'bold' },
  addBtn: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#e334e3', padding: 8, borderRadius: 8 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, textAlign: 'center' },
  sortOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#eee' },
  sortText: { fontSize: 16, marginLeft: 10, flex: 1 },
  closeButton: { marginTop: 20, padding: 15, borderRadius: 12, alignItems: 'center' },
  closeButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});