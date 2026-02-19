import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text, TextInput,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// 👇 1. Імпортуємо хук, щоб читати дані користувача
import { useSelector } from 'react-redux';

import Colors from '../../constants/Colors';
import { categories, promotions, stores } from '../../data/mockData.js';

export default function HomeScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  
  // 👇 2. Дістаємо дані про користувача з Redux
  const { user } = useSelector((state) => state.auth);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);

  // Логіка фільтрації
  const filteredStores = stores.filter(store => {
    const matchesSearch = store.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    let matchesCategory = true;
    if (selectedCategory) {
        const searchTag = selectedCategory === "Магазини" ? "Магазин" : selectedCategory;
        matchesCategory = store.tags.includes(searchTag);
    }

    return matchesSearch && matchesCategory;
  });

  const handleCategoryPress = (catName) => {
    if (selectedCategory === catName) {
      setSelectedCategory(null);
    } else {
      setSelectedCategory(catName);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      {/* 1. Шапка */}
      <View style={styles.header}>
        <View>
          <Text style={{ color: theme.textSecondary, fontSize: 12 }}>Доставка в:</Text>
          <TouchableOpacity style={styles.addressBtn} onPress={() => router.push('/location-picker')}>
            <Text style={[styles.addressText, { color: theme.text }]}>Оберіть адресу</Text>
            <Ionicons name="location" size={18} color="#e334e3" />
            <Ionicons name="chevron-down" size={16} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* 👇 3. ТУТ ЗМІНИ: Якщо є аватар — показуємо фото, якщо ні — іконку */}
        <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
           {user && user.avatar ? (
             <Image 
               source={{ uri: user.avatar }} 
               style={styles.headerAvatar} 
             />
           ) : (
             <Ionicons name="person-circle-outline" size={40} color={theme.text} />
           )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        {/* Пошук */}
        <View style={[styles.searchContainer, { backgroundColor: theme.input }]}>
          <Ionicons name="search" size={20} color={theme.textSecondary} />
          <TextInput 
            placeholder="Шукати їжу або ресторан..." 
            placeholderTextColor={theme.textSecondary}
            style={[styles.searchInput, { color: theme.text }]}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Банери */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Гарячі пропозиції 🔥</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll}>
          {promotions && promotions.map((promo) => (
            <View key={promo.id} style={styles.promoCard}>
              <Image source={{ uri: promo.image }} style={styles.promoImage} />
              <View style={styles.promoOverlay}>
                <Text style={styles.promoTitle}>{promo.title}</Text>
                <TouchableOpacity style={styles.promoBtn}>
                  <Text style={styles.promoBtnText}>Детальніше</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Категорії */}
        <View style={{flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20}}>
            <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>Категорії</Text>
            {selectedCategory && (
                <TouchableOpacity onPress={() => setSelectedCategory(null)}>
                    <Text style={{color: '#e334e3', fontWeight: 'bold', marginBottom: 15}}>Очистити</Text>
                </TouchableOpacity>
            )}
        </View>
        
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, paddingLeft: 20 }}>
          {categories && categories.map((cat) => {
            const isSelected = selectedCategory === cat.name;
            return (
                <TouchableOpacity 
                    key={cat.category_id} 
                    style={styles.catItem}
                    onPress={() => handleCategoryPress(cat.name)}
                >
                <View style={[
                    styles.catCircle, 
                    { 
                        backgroundColor: isSelected ? '#e334e3' : theme.card,
                        borderWidth: isSelected ? 2 : 0,
                        borderColor: '#e334e3'
                    }
                ]}>
                    <Image 
                        source={{ uri: cat.image }} 
                        style={{ width: 35, height: 35, tintColor: isSelected ? 'white' : null }} 
                    />
                </View>
                <Text style={[
                    styles.catText, 
                    { 
                        color: isSelected ? '#e334e3' : theme.textSecondary,
                        fontWeight: isSelected ? 'bold' : '500'
                    }
                ]}>
                    {cat.name}
                </Text>
                </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Список закладів */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {selectedCategory ? `Заклади: ${selectedCategory}` : 'Всі заклади'}
        </Text>
        
        {filteredStores.length > 0 ? (
            filteredStores.map((store) => (
            <TouchableOpacity 
                key={store.store_id} 
                style={[styles.storeCard, { backgroundColor: theme.card }]}
                onPress={() => router.push(`/restaurant/${store.store_id}`)}
            >
                <Image source={{ uri: store.image }} style={styles.storeImage} />
                <View style={styles.storeInfo}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                    <Text style={[styles.storeName, { color: theme.text }]}>{store.name}</Text>
                    <View style={styles.ratingBadge}>
                        <Text style={styles.ratingText}>⭐️ {store.rating}</Text>
                    </View>
                </View>
                <Text style={[styles.storeMeta, { color: theme.textSecondary }]}>
                    {store.tags.join(' • ')}
                </Text>
                <View style={styles.timeBadge}>
                    <Text style={styles.timeText}>{store.delivery_time}</Text>
                </View>
                </View>
            </TouchableOpacity>
            ))
        ) : (
            <View style={{alignItems: 'center', marginTop: 30}}>
                <Ionicons name="sad-outline" size={50} color="gray" />
                <Text style={{color: 'gray', marginTop: 10}}>Нічого не знайдено</Text>
            </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  
  // 👇 Стиль для аватарки в шапці
  headerAvatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: '#e334e3' },
  
  addressBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 4 },
  addressText: { fontSize: 16, fontWeight: 'bold' },
  
  searchContainer: { flexDirection: 'row', alignItems: 'center', marginHorizontal: 20, padding: 12, borderRadius: 12, marginBottom: 20 },
  searchInput: { marginLeft: 10, flex: 1, fontSize: 16 },
  
  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15 },
  
  promoScroll: { paddingLeft: 20, marginBottom: 25 },
  promoCard: { width: 300, height: 160, marginRight: 15, borderRadius: 16, overflow: 'hidden', position: 'relative' },
  promoImage: { width: '100%', height: '100%' },
  promoOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.3)', padding: 15, justifyContent: 'center' },
  promoTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', width: '70%', marginBottom: 10 },
  promoBtn: { backgroundColor: 'white', alignSelf: 'flex-start', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 20 },
  promoBtnText: { fontWeight: 'bold', fontSize: 12 },

  catItem: { alignItems: 'center', marginRight: 20 },
  catCircle: { width: 65, height: 65, borderRadius: 32.5, justifyContent: 'center', alignItems: 'center', marginBottom: 5, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  catText: { fontSize: 12, fontWeight: '500' },

  storeCard: { marginHorizontal: 20, marginBottom: 20, borderRadius: 16, overflow: 'hidden', elevation: 3, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
  storeImage: { width: '100%', height: 180 },
  storeInfo: { padding: 15 },
  storeName: { fontSize: 18, fontWeight: 'bold' },
  ratingBadge: { backgroundColor: '#f0f0f0', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  ratingText: { fontSize: 12, fontWeight: 'bold' },
  storeMeta: { fontSize: 14, marginTop: 4 },
  timeBadge: { position: 'absolute', top: -190, right: 15, backgroundColor: 'white', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  timeText: { fontWeight: 'bold', fontSize: 12 },
});