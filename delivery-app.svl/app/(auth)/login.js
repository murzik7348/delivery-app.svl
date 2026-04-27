import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';

import Colors from '../../constants/Colors';
import { authLogin, getMe } from '../../src/api';
import { fetchAddresses, loginUser } from '../../store/authSlice';

const { width } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [phone, setPhone] = useState('+380');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const [isSupportVisible, setIsSupportVisible] = useState(false);

  const handlePhoneChange = (text) => {
    if (!text.startsWith('+380')) {
      setPhone('+380');
      return;
    }
    if (text.length > 13) return;
    const onlyNumbers = text.substring(1).replace(/[^0-9]/g, '');
    setPhone('+' + onlyNumbers);
  };

  const handleLogin = async () => {
    if (phone.length < 13) {
      Alert.alert('Помилка', 'Будь ласка, введіть повний номер телефону');
      return;
    }
    if (!password) {
      Alert.alert('Помилка', 'Введіть пароль');
      return;
    }

    setIsLoading(true);
    try {
      await authLogin({ phoneNumber: phone, password });
      const me = await getMe();
      const user = me ?? {};
      dispatch(loginUser(user));
      dispatch(fetchAddresses());
      router.replace('/home');
    } catch (err) {
      Alert.alert('Помилка входу', err.message || 'Щось пішло не так. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const openSupport = (type) => {
    let url = '';
    switch (type) {
      case 'telegram':
        url = 'https://t.me/delivery_app_support';
        break;
      case 'viber':
        url = 'viber://chat?number=%2B380930000000'; 
        break;
      case 'email':
        url = 'mailto:support@delivery-app.com.ua';
        break;
    }

    if (url) {
      Linking.openURL(url).catch(() => {
        Alert.alert('Помилка', 'Не вдалося відкрити додаток. Переконайтеся, що він встановлений.');
      });
    }
    setIsSupportVisible(false);
  };

  return (
    <View style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f8f9fa' }]}>
      {/* Background Decoration */}
      <View style={[styles.circle, { top: -100, right: -50, backgroundColor: '#e334e320' }]} />
      <View style={[styles.circle, { bottom: -50, left: -50, backgroundColor: '#34e3e320', width: 250, height: 250 }]} />

      <SafeAreaView style={{ flex: 1 }}>
        <Animated.View style={[styles.topActions, { opacity: fadeAnim }]}>
          <TouchableOpacity style={styles.supportButton} onPress={() => setIsSupportVisible(true)}>
            <Ionicons name="headset-outline" size={20} color={isDark ? '#fff' : '#333'} />
            <Text style={[styles.supportText, { color: isDark ? '#fff' : '#333' }]}>Support</Text>
          </TouchableOpacity>
        </Animated.View>

        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.headerSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.logoContainer}>
                <Ionicons name="bicycle" size={50} color="#e334e3" />
              </View>
              <Text style={[styles.header, { color: isDark ? '#fff' : '#000' }]}>Вітаємо!</Text>
              <Text style={[styles.subHeader, { color: isDark ? '#aaa' : '#666' }]}>Увійдіть, щоб продовжити</Text>
            </Animated.View>

            <Animated.View style={[styles.formSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
              <View style={styles.inputWrapper}>
                <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.blurInput}>
                  <Ionicons name="call-outline" size={20} color="#e334e3" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                    value={phone}
                    onChangeText={handlePhoneChange}
                    keyboardType="phone-pad"
                    placeholderTextColor={isDark ? '#555' : '#999'}
                    editable={!isLoading}
                  />
                </BlurView>
              </View>

              <View style={styles.inputWrapper}>
                <BlurView intensity={isDark ? 30 : 60} tint={isDark ? 'dark' : 'light'} style={styles.blurInput}>
                  <Ionicons name="lock-closed-outline" size={20} color="#e334e3" style={styles.inputIcon} />
                  <TextInput
                    style={[styles.input, { color: isDark ? '#fff' : '#000' }]}
                    placeholder="Пароль"
                    placeholderTextColor={isDark ? '#555' : '#999'}
                    secureTextEntry
                    value={password}
                    onChangeText={setPassword}
                    editable={!isLoading}
                  />
                </BlurView>
              </View>

              <TouchableOpacity
                style={[styles.button, isLoading && { opacity: 0.7 }]}
                activeOpacity={0.8}
                onPress={handleLogin}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text style={styles.buttonText}>Увійти</Text>
                )}
              </TouchableOpacity>
            </Animated.View>

            <Animated.View style={[styles.footerSection, { opacity: fadeAnim }]}>
              <TouchableOpacity onPress={() => router.push('/register')} style={styles.link}>
                <Text style={[styles.linkText, { color: isDark ? '#aaa' : '#666' }]}>
                  Немає акаунту?{' '}
                  <Text style={styles.linkHighlight}>Створити</Text>
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Support Selection Modal */}
      {isSupportVisible && (
        <View style={StyleSheet.absoluteFill}>
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPress={() => setIsSupportVisible(false)}
          />
          <View style={styles.modalContentWrapper}>
            <BlurView intensity={80} tint={isDark ? 'dark' : 'light'} style={styles.supportModal}>
              <Text style={[styles.modalTitle, { color: isDark ? '#fff' : '#000' }]}>Допомога та підтримка</Text>
              
              <TouchableOpacity style={styles.supportOption} onPress={() => openSupport('telegram')}>
                <View style={[styles.iconCircle, { backgroundColor: '#0088cc' }]}>
                  <Ionicons name="paper-plane" size={24} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: isDark ? '#fff' : '#333' }]}>Telegram</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.supportOption} onPress={() => openSupport('viber')}>
                <View style={[styles.iconCircle, { backgroundColor: '#7360f2' }]}>
                  <Ionicons name="chatbubble-ellipses" size={24} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: isDark ? '#fff' : '#333' }]}>Viber</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.supportOption} onPress={() => openSupport('email')}>
                <View style={[styles.iconCircle, { backgroundColor: '#e334e3' }]}>
                  <Ionicons name="mail" size={24} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: isDark ? '#fff' : '#333' }]}>Email</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.closeButton, { backgroundColor: isDark ? '#333' : '#eee' }]} 
                onPress={() => setIsSupportVisible(false)}
              >
                <Text style={[styles.closeButtonText, { color: isDark ? '#fff' : '#333' }]}>Скасувати</Text>
              </TouchableOpacity>
            </BlurView>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  circle: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    zIndex: -1,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(227, 52, 227, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(227, 52, 227, 0.2)',
  },
  supportText: { marginLeft: 6, fontWeight: '600', fontSize: 14 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 30, paddingBottom: 40 },
  headerSection: { alignItems: 'center', marginTop: 40, marginBottom: 40 },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    ...Platform.select({
      ios: { shadowColor: '#e334e3', shadowOpacity: 0.2, shadowRadius: 15, shadowOffset: { width: 0, height: 10 } },
      android: { elevation: 10 },
    }),
  },
  header: { fontSize: 32, fontWeight: '800', marginBottom: 10 },
  subHeader: { fontSize: 16, fontWeight: '500' },
  formSection: { width: '100%' },
  inputWrapper: { marginBottom: 20, borderRadius: 18, overflow: 'hidden' },
  blurInput: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(227, 52, 227, 0.1)',
  },
  inputIcon: { marginRight: 15 },
  input: { flex: 1, fontSize: 18, fontWeight: '500' },
  button: {
    height: 64,
    backgroundColor: '#e334e3',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    ...Platform.select({
      ios: { shadowColor: '#e334e3', shadowOpacity: 0.4, shadowRadius: 12, shadowOffset: { width: 0, height: 8 } },
      android: { elevation: 8 },
    }),
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  footerSection: { marginTop: 40, alignItems: 'center' },
  link: { padding: 10 },
  linkText: { fontSize: 16 },
  linkHighlight: { color: '#e334e3', fontWeight: '800' },
  
  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  supportModal: {
    width: width - 40,
    borderRadius: 30,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  supportOptionText: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    marginTop: 10,
    height: 56,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
});