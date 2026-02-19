import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { stores } from '../data/mockData.js';
import { toggleFavorite } from '../store/favoritesSlice';

export default function FavoritesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  // Беремо лайки з Redux
  const favoriteIds = useSelector(state => state.favorites.ids);
  // Шукаємо ресторани
  const favoriteRestaurants = stores.filter(store => favoriteIds.includes(store.store_id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>Улюблені заклади ❤️</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={favoriteRestaurants}
        keyExtractor={item => item.store_id.toString()}
        contentContainerStyle={{ padding: 20 }}
        ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 50 }}>
                <Ionicons name="heart-dislike-outline" size={60} color="gray" />
                <Text style={{ color: 'gray', marginTop: 10 }}>Список порожній</Text>
            </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.card, { backgroundColor: theme.card }]}
            onPress={() => router.push(`/restaurant/${item.store_id}`)}
          >
            <Image source={{ uri: item.image }} style={styles.image} />
            <View style={styles.info}>
              <View style={styles.row}>
                <Text style={[styles.name, { color: theme.text }]}>{item.name}</Text>
                <Text style={{fontSize: 12}}>⭐️ {item.rating}</Text>
              </View>
              <Text style={styles.tags}>{item.tags.join(' • ')}</Text>
              <Text style={styles.delivery}>{item.delivery_time}</Text>
            </View>
            <TouchableOpacity 
                style={styles.removeBtn} 
                onPress={() => dispatch(toggleFavorite(item.store_id))}
            >
                <Ionicons name="heart" size={24} color="#e334e3" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  card: { flexDirection: 'row', borderRadius: 16, marginBottom: 16, padding: 10, elevation: 2 },
  image: { width: 70, height: 70, borderRadius: 12 },
  info: { flex: 1, marginLeft: 12, justifyContent: 'center' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  name: { fontSize: 16, fontWeight: 'bold' },
  tags: { fontSize: 12, color: 'gray' },
  delivery: { fontSize: 12, color: 'gray' },
  removeBtn: { padding: 10 }
});