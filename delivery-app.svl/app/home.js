import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { BlurView } from 'expo-blur';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import PromoSheet from '../components/PromoSheet';
import { fetchCatalog, selectAllCategories, selectAllStores, selectAllPromotions } from '../store/catalogSlice';
import { resolveImageUrl } from '../src/api/client';

const StoreCardItem = ({ store, theme, router }) => {
  const [scaleAnim] = useState(new Animated.Value(1));
  
  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.96, useNativeDriver: true }).start();
  };
  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, friction: 3, tension: 40, useNativeDriver: true }).start();
  };

  return (
    <TouchableOpacity
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/restaurant/${store.store_id}`);
      }}
      activeOpacity={1}
    >
      <Animated.View style={[styles.storeCard, { backgroundColor: theme.card, transform: [{ scale: scaleAnim }] }]}>
        <Image source={{ uri: store.image }} style={styles.storeImage} />
        
        {/* Glassmorphism Badges overlay the image */}
        <View style={styles.badgesOverlay}>
            <BlurView intensity={60} tint="dark" style={styles.timeBadgeBlur}>
              <Ionicons name="time" size={12} color="white" style={{marginRight: 4}} />
              <Text style={styles.timeTextBlur}>{store.delivery_time}</Text>
            </BlurView>
        </View>

        <View style={styles.storeInfo}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={[styles.storeName, { color: theme.text }]} numberOfLines={1}>{store.name}</Text>
            <View style={[styles.ratingBadge, { backgroundColor: theme.card === '#000000' ? '#222' : '#f0f0f0' }]}>
              <Ionicons name="star" size={12} color="#f1c40f" style={{marginRight: 3}} />
              <Text style={[styles.ratingText, { color: theme.text }]}>{store.rating}</Text>
            </View>
          </View>
          <Text style={[styles.storeMeta, { color: theme.textSecondary }]}>
            {store.tags.join(' • ')}
          </Text>
        </View>
      </Animated.View>
    </TouchableOpacity>
  );
};

export default function HomeScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const { user } = useSelector((state) => state.auth);
  const locale = useSelector((s) => s.language?.locale ?? 'uk');
  // Use real categories from Redux (populated by fetchCatalog thunk)
  const categories = useSelector(selectAllCategories);
  const stores = useSelector(selectAllStores);
  const promotions = useSelector(selectAllPromotions);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedPromo, setSelectedPromo] = useState(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const searchScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // Fetch real catalog data from API
    dispatch(fetchCatalog());

    // Existing pulse animation
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.2, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleSearchPress = () => {
    Animated.sequence([
      Animated.timing(searchScale, { toValue: 0.97, duration: 80, useNativeDriver: true }),
      Animated.timing(searchScale, { toValue: 1, duration: 120, useNativeDriver: true }),
    ]).start(() => router.push('/search'));
  };

  const filteredStores = stores.filter(store => {
    if (!selectedCategory) return true;
    const isStoreCategoryShop = selectedCategory === 'Магазини';
    // For now we map everything fetched from API as "Ресторан" tag by default in CatalogService
    // To support separating them into the category folders we just check if it matches tags
    const tag = isStoreCategoryShop ? 'Магазин' : selectedCategory;
    return store.tags?.includes(tag);
  });

  const handleCategoryPress = (catName) => {
    setSelectedCategory(prev => prev === catName ? null : catName);
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>

      {/* ── Шапка ── */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.addressArea}
          activeOpacity={0.75}
          onPress={() => router.push('/location-picker')}
        >
          <Text style={[styles.deliveryLabel, { color: 'gray' }]}>{t(locale, 'deliveryTo')}</Text>
          <View style={styles.addressRow}>
            <Text style={[styles.addressText, { color: theme.text }]} numberOfLines={1}>
              {t(locale, 'chooseAddress')}
            </Text>
            <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
              <Ionicons name="location" size={16} color="#e334e3" />
            </Animated.View>
            <Ionicons name="chevron-down" size={14} color="gray" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/profile')}
          style={styles.avatarWrapper}
          activeOpacity={0.85}
        >
          {user?.avatarUrl || user?.avatar ? (
            <Image 
              source={{ uri: resolveImageUrl(user.avatarUrl || user.avatar) }} 
              style={styles.avatar} 
            />
          ) : (
            <View style={[styles.avatarFallback, { backgroundColor: theme.card }]}>
              <Ionicons name="person" size={20} color="#e334e3" />
            </View>
          )}
          <View style={styles.avatarRing} />
        </TouchableOpacity>
      </View>

      {/* ── Пошуковий рядок ── */}
      <Animated.View style={[styles.searchWrapper, { transform: [{ scale: searchScale }] }]}>
        <TouchableOpacity
          style={[styles.searchBar, { backgroundColor: theme.input, shadowColor: '#e334e3' }]}
          activeOpacity={1}
          onPress={handleSearchPress}
        >
          <View style={styles.searchIconWrap}>
            <Ionicons name="search" size={18} color="#e334e3" />
          </View>
          <Text style={[styles.searchPlaceholder, { color: 'gray' }]}>
            {t(locale, 'searchPlaceholder')}
          </Text>
          <View style={[styles.searchBadge, { backgroundColor: '#e334e322' }]}>
            <Ionicons name="options-outline" size={16} color="#e334e3" />
          </View>
        </TouchableOpacity>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 140 }}>

        {/* Горячі пропозиції */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>{t(locale, 'hotDeals')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promoScroll}>
          {promotions && promotions.map((promo) => (
            <TouchableOpacity
              key={promo.id}
              style={styles.promoCard}
              activeOpacity={0.9}
              onPress={() => setSelectedPromo(promo)}
            >
              <Image source={{ uri: promo.image }} style={styles.promoImage} />
              {/* Темний градієнт знизу */}
              <View style={styles.promoOverlay}>
                <Text style={styles.promoTitle} numberOfLines={2}>{promo.title}</Text>
                <TouchableOpacity style={styles.promoBtn} onPress={() => setSelectedPromo(promo)}>
                  <Text style={styles.promoBtnText}>{t(locale, 'moreDetails')}</Text>
                </TouchableOpacity>
              </View>
              {/* Кольоровий тег знижки */}
              {promo.tag && (
                <View style={[styles.promoTag, { backgroundColor: promo.tagColor ?? '#e334e3' }]}>
                  <Text style={styles.promoTagText}>{promo.tag}</Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>


        {/* Категорії */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingRight: 20 }}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 15 }]}>{t(locale, 'categories')}</Text>
          {selectedCategory && (
            <TouchableOpacity onPress={() => setSelectedCategory(null)}>
              <Text style={{ color: '#e334e3', fontWeight: 'bold', marginBottom: 15 }}>{t(locale, 'clear')}</Text>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 20, paddingLeft: 20 }}>
          {categories && categories.map((cat, index) => {
            const isSelected = selectedCategory === cat.name;
            return (
              <TouchableOpacity
                key={`cat-${cat.id || cat.category_id || index}`}
                style={styles.catItem}
                onPress={() => handleCategoryPress(cat.name)}
              >
                <View style={[
                  styles.catCircle,
                  {
                    backgroundColor: isSelected ? '#e334e3' : theme.card,
                    borderWidth: isSelected ? 2 : 0,
                    borderColor: '#e334e3',
                  }
                ]}>
                  {cat.image ? (
                    <Image 
                      source={{ uri: cat.image }} 
                      style={{ width: 35, height: 35, tintColor: isSelected ? 'white' : null }} 
                    />
                  ) : (
                    <Text style={{ fontSize: 28 }}>{cat.sticker || '🍽️'}</Text>
                  )}
                </View>
                <Text style={[
                  styles.catText,
                  { color: isSelected ? '#e334e3' : theme.textSecondary, fontWeight: isSelected ? 'bold' : '500' }
                ]}>
                  {cat.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Список закладів */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {selectedCategory ? `${t(locale, 'storesIn')} ${selectedCategory}` : t(locale, 'allStores')}
        </Text>

        {
          filteredStores.length > 0 ? (
            filteredStores.map((store, index) => (
              <StoreCardItem 
                key={store.store_id || `store-${index}`} 
                store={store} 
                theme={theme} 
                router={router} 
              />
            ))
          ) : (
            <View style={{ alignItems: 'center', marginTop: 30 }}>
              <Ionicons name="sad-outline" size={50} color="gray" />
              <Text style={{ color: 'gray', marginTop: 10 }}>{t(locale, 'nothingFound')}</Text>
            </View>
          )
        }

      </ScrollView >

      {selectedPromo && (
        <PromoSheet
          promo={selectedPromo}
          onClose={() => setSelectedPromo(null)}
        />
      )
      }
    </SafeAreaView >
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 4,
  },

  addressArea: { flex: 1 },
  deliveryLabel: { fontSize: 11, fontWeight: '500', letterSpacing: 0.3, marginBottom: 3 },
  addressRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  addressText: { fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },

  avatarWrapper: { position: 'relative', marginLeft: 12 },
  avatar: { width: 42, height: 42, borderRadius: 21 },
  avatarFallback: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarRing: {
    position: 'absolute',
    top: -2,
    left: -2,
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: '#e334e3',
  },

  searchWrapper: {
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 6,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    borderRadius: 18,
    paddingHorizontal: 14,
    shadowOpacity: 0.22,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 5 },
    elevation: 8,
  },
  searchIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#e334e310',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  searchPlaceholder: { flex: 1, fontSize: 15, fontWeight: '500' },
  searchBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },

  sectionTitle: { fontSize: 20, fontWeight: 'bold', marginLeft: 20, marginBottom: 15, marginTop: 10 },

  promoScroll: { paddingLeft: 20, marginBottom: 25 },
  promoCard: {
    width: 280,
    height: 165,
    marginRight: 14,
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 5 },
    elevation: 6,
  },
  promoImage: { width: '100%', height: '100%', resizeMode: 'cover' },
  promoOverlay: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    height: '75%',
    backgroundColor: 'rgba(0,0,0,0)',
    padding: 14,
    justifyContent: 'flex-end',
    background: 'linear-gradient(transparent, rgba(0,0,0,0.75))',
  },
  promoTitle: {
    color: 'white', fontSize: 16, fontWeight: '800',
    marginBottom: 10, lineHeight: 20,
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 6,
  },
  promoBtn: {
    backgroundColor: 'white', alignSelf: 'flex-start',
    paddingVertical: 5, paddingHorizontal: 14, borderRadius: 20,
  },
  promoBtnText: { fontWeight: '700', fontSize: 12, color: '#111' },
  promoTag: {
    position: 'absolute', top: 12, right: 12,
    paddingHorizontal: 10, paddingVertical: 4,
    borderRadius: 20,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 4, elevation: 4,
  },
  promoTagText: { color: 'white', fontWeight: '900', fontSize: 12, letterSpacing: 0.5 },

  catItem: { alignItems: 'center', marginRight: 20 },
  catCircle: { width: 68, height: 68, borderRadius: 34, justifyContent: 'center', alignItems: 'center', marginBottom: 8, elevation: 4, shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  catText: { fontSize: 13, fontWeight: '600' },

  storeCard: { marginHorizontal: 20, marginBottom: 24, borderRadius: 24, overflow: 'hidden', elevation: 6, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 15, shadowOffset: { width: 0, height: 8 } },
  storeImage: { width: '100%', height: 200 },
  badgesOverlay: { position: 'absolute', top: 140, right: 14, flexDirection: 'row' },
  timeBadgeBlur: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, overflow: 'hidden' },
  timeTextBlur: { color: 'white', fontWeight: '800', fontSize: 13, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 4 },
  
  storeInfo: { padding: 18 },
  storeName: { fontSize: 20, fontWeight: '900', flex: 1, marginRight: 10, letterSpacing: -0.2 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  ratingText: { fontSize: 13, fontWeight: '800' },
  storeMeta: { fontSize: 14, marginTop: 6, opacity: 0.8, fontWeight: '500' },
});