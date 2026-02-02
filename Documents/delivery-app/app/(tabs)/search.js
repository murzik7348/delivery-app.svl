import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
    FlatList,
    Image,
    Keyboard,
    StyleSheet,
    Text, TextInput,
    TouchableOpacity,
    useColorScheme,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';
import { categories, stores } from '../../data/mockData';

export default function SearchScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [query, setQuery] = useState('');

  // 🔍 РОЗУМНИЙ ПОШУК
  const results = useMemo(() => {
    if (!query) return [];

    const lowerText = query.toLowerCase();
    
    // 1. Шукаємо ресторани
    const foundStores = stores.filter(store => 
      store.name.toLowerCase().includes(lowerText) || 
      store.tags.some(tag => tag.toLowerCase().includes(lowerText))
    ).map(store => ({ type: 'store', data: store }));

    // 2. Шукаємо конкретні страви всередині ресторанів
    const foundDishes = [];
    stores.forEach(store => {
      // (Припускаємо, що у store є menu або dishes, якщо ні - беремо з mockData)
      // Для прикладу, якщо у твоїх даних немає вкладеного меню, 
      // цей код просто буде ігнорувати страви, поки ми не додамо меню в структуру.
      // Але я напишу логіку на майбутнє:
      if (store.dishes) { // Якщо у закладу є список страв
         store.dishes.forEach(dish => {
            if (dish.name.toLowerCase().includes(lowerText)) {
                foundDishes.push({ type: 'dish', data: dish, storeId: store.store_id, storeName: store.name });
            }
         });
      }
    });

    return [...foundStores, ...foundDishes];
  }, [query]);

  // Рендер елемента списку (Ресторан або Страва)
  const renderItem = ({ item }) => {
    if (item.type === 'store') {
      // Картка ресторану
      return (
        <TouchableOpacity 
          style={[styles.resultItem, { backgroundColor: theme.card }]}
          onPress={() => router.push(`/restaurant/${item.data.store_id}`)}
        >
          <Image source={{ uri: item.data.image }} style={styles.resultImage} />
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>{item.data.name}</Text>
            <Text style={styles.resultSubtitle}>🍽 Ресторан • {item.data.delivery_time}</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    } else {
      // Картка страви
      return (
        <TouchableOpacity 
          style={[styles.resultItem, { backgroundColor: theme.card }]}
          onPress={() => router.push(`/restaurant/${item.storeId}`)}
        >
          <Image source={{ uri: item.data.image }} style={styles.resultImage} />
          <View style={styles.resultInfo}>
            <Text style={[styles.resultTitle, { color: theme.text }]}>{item.data.name}</Text>
            <Text style={styles.resultSubtitle}>🥗 Страва у "{item.storeName}"</Text>
            <Text style={{color: '#e334e3', fontWeight: 'bold'}}>{item.data.price} грн</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      
      {/* Поле пошуку */}
      <View style={[styles.searchHeader, { borderBottomColor: theme.border }]}>
        <View style={[styles.searchBar, { backgroundColor: theme.input }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput
            style={[styles.input, { color: theme.text }]}
            placeholder="Ресторани, їжа, напої..."
            placeholderTextColor={theme.textSecondary}
            value={query}
            onChangeText={setQuery}
            autoFocus={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => { setQuery(''); Keyboard.dismiss(); }}>
              <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Вміст екрану */}
      {query.length === 0 ? (
        // 🔹 СТАН 1: Показуємо категорії (коли нічого не введено)
        <View style={styles.categoriesContainer}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Популярні категорії 🔥</Text>
          <FlatList 
            data={categories}
            keyExtractor={item => item.category_id}
            numColumns={2} // Сітка по 2
            columnWrapperStyle={{ justifyContent: 'space-between' }}
            renderItem={({ item }) => (
              <TouchableOpacity style={[styles.catCard, { backgroundColor: theme.card }]}>
                <Image source={{ uri: item.image }} style={styles.catImage} />
                <Text style={[styles.catName, { color: theme.text }]}>{item.name}</Text>
              </TouchableOpacity>
            )}
          />
        </View>
      ) : (
        // 🔹 СТАН 2: Результати пошуку
        <FlatList
          data={results}
          keyExtractor={(item, index) => index.toString()}
          contentContainerStyle={{ padding: 20 }}
          renderItem={renderItem}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
              <Ionicons name="search-outline" size={60} color="gray" />
              <Text style={{ color: 'gray', marginTop: 10 }}>Нічого не знайдено :(</Text>
            </View>
          }
        />
      )}

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  searchHeader: { padding: 16, borderBottomWidth: 1 },
  searchBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, height: 50, borderRadius: 12 },
  input: { flex: 1, marginLeft: 10, fontSize: 16 },
  
  categoriesContainer: { flex: 1, padding: 20 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15 },
  
  // Стилі для категорій (сітка)
  catCard: { width: '48%', height: 100, marginBottom: 15, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 2 },
  catImage: { width: 40, height: 40, marginBottom: 8 },
  catName: { fontWeight: 'bold', fontSize: 14 },

  // Стилі для результатів
  resultItem: { flexDirection: 'row', alignItems: 'center', padding: 12, borderRadius: 12, marginBottom: 10 },
  resultImage: { width: 50, height: 50, borderRadius: 8, marginRight: 12 },
  resultInfo: { flex: 1 },
  resultTitle: { fontSize: 16, fontWeight: 'bold' },
  resultSubtitle: { fontSize: 12, color: 'gray', marginTop: 2 },
});