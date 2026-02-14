import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { restaurants } from '../../data/mockData';

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const [searchQuery, setSearchQuery] = useState('');

  // Дані
  const allProducts = useMemo(() => {
    return restaurants.flatMap(r => r.meals || r.products || []);
  }, []);

  // Фільтрація
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const lowerText = searchQuery.toLowerCase();
    return allProducts.filter(p => p.name.toLowerCase().includes(lowerText));
  }, [allProducts, searchQuery]);

  // Картка
  const renderProductItem = ({ item }) => (
    <TouchableOpacity 
      style={[styles.card, { backgroundColor: theme.card }]}
      onPress={() => router.push(`/restaurant/${item.id}`)}
    >
      <Image source={{ uri: item.img || item.image }} style={styles.cardImage} />
      <View style={styles.cardContent}>
        <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>{item.name}</Text>
        <Text style={[styles.cardPrice, { color: theme.tint }]}>{item.price} грн</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Рядок пошуку */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 10 }}>
          <Ionicons name="arrow-back" size={28} color={theme.text} />
        </TouchableOpacity>
        
        <View style={[styles.searchBar, { backgroundColor: theme.input }]}>
          <Ionicons name="search" size={20} color="gray" />
          <TextInput 
            style={[styles.input, { color: theme.text }]}
            placeholder="Введіть назву страви..."
            placeholderTextColor="gray"
            autoFocus={true} // 👈 Одразу відкриває клавіатуру
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="gray" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {searchQuery.length > 0 ? (
          <>
            <Text style={[styles.resultTitle, { color: theme.text }]}>Результати пошуку ({filteredProducts.length})</Text>
            <View style={styles.grid}>
              {filteredProducts.map((item, index) => (
                <View key={index} style={{ width: '48%', marginBottom: 16 }}>
                  {renderProductItem({ item })}
                </View>
              ))}
            </View>
            {filteredProducts.length === 0 && (
              <Text style={{ textAlign: 'center', marginTop: 20, color: 'gray' }}>Нічого не знайдено 😔</Text>
            )}
          </>
        ) : (
          <View style={{ alignItems: 'center', marginTop: 50 }}>
            <Ionicons name="search-outline" size={60} color="#ccc" />
            <Text style={{ color: 'gray', marginTop: 10 }}>Почніть вводити текст для пошуку</Text>
          </View>
        )}
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#eee' },
  searchBar: { flex: 1, flexDirection: 'row', alignItems: 'center', height: 46, borderRadius: 12, paddingHorizontal: 12 },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  resultTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  card: { borderRadius: 12, overflow: 'hidden', paddingBottom: 10 },
  cardImage: { width: '100%', height: 120 },
  cardContent: { padding: 8 },
  cardTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 4 },
  cardPrice: { fontSize: 14, fontWeight: 'bold' },
});