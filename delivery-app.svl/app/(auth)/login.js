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
  View,
  Dimensions,
  Animated,
  Image,
} from 'react-native';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import * as Linking from 'expo-linking';

import Colors from '../../constants/Colors';
import { authLogin, getMe } from '../../src/api';
import { fetchAddresses, loginUser } from '../../store/authSlice';
import { setTheme } from '../../store/uiSlice';
import DarkModeToggle from '../../components/DarkModeToggle';

const { width, height } = Dimensions.get('window');

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const colorScheme = useColorScheme();
  const isDarkCover = colorScheme === 'dark';
  const [phone, setPhone] = useState('+380');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Input focus states for dynamic borders
  const [isPhoneFocused, setIsPhoneFocused] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Animated values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const logoScale = useRef(new Animated.Value(0.9)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;
  const coverAnimation = useRef(new Animated.Value(0)).current; // 0 for black (Dark), 1 for ping (Light)

  useEffect(() => {
    // Entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        tension: 10,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Loop for pulsating background glow
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, {
          toValue: 1.1,
          duration: 4000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnim, {
          toValue: 0.6,
          duration: 4000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    // Animate cover cross-fade transitions
    Animated.timing(coverAnimation, {
      toValue: isDarkCover ? 0 : 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, [isDarkCover]);

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

  const insets = useSafeAreaInsets();

  // Premium colors derived from active theme
  const activeBg = isDarkCover ? '#171717' : '#F14FF1';
  const inputBg = isDarkCover ? 'rgba(21, 10, 33, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const primaryColor = '#E22BC6'; // Electric Pink
  const textColor = isDarkCover ? '#ffffff' : '#0a0514';
  const textMuted = isDarkCover ? '#a099aa' : '#6c627a';
  const borderLight = isDarkCover ? 'rgba(255, 255, 255, 0.08)' : 'rgba(10, 5, 20, 0.06)';
  const borderActive = primaryColor;
  const overlayColor = isDarkCover ? 'rgba(0, 0, 0, 0.15)' : 'rgba(255, 255, 255, 0.1)';

  return (
    <View style={[styles.container, { backgroundColor: activeBg }]}>
      {/* Background Cover Switcher */}
      {/* Light Theme Background: Solid Pink with Centered Logo */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#F14FF1',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: coverAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [0, 1],
            }),
          }
        ]}
      >
        <Image
          source={require('../../assets/images/logo_light.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Dark Theme Background: Solid Black with Centered Logo */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: '#171717',
            justifyContent: 'center',
            alignItems: 'center',
            opacity: coverAnimation.interpolate({
              inputRange: [0, 1],
              outputRange: [1, 0],
            }),
          }
        ]}
      >
        <Image
          source={require('../../assets/images/logo_dark.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Cinematic Tint Overlay */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: overlayColor }]} />

      {/* Decorative Glowing Elements */}
      <Animated.View 
        style={[
          styles.glowCircle, 
          { 
            top: -50, 
            right: -50, 
            backgroundColor: primaryColor, 
            opacity: isDarkCover ? 0.15 : 0.08,
            transform: [{ scale: glowAnim }]
          }
        ]} 
      />
      <Animated.View 
        style={[
          styles.glowCircle, 
          { 
            bottom: -50, 
            left: -50, 
            backgroundColor: '#8b5cf6', 
            opacity: isDarkCover ? 0.12 : 0.06, 
            width: 250, 
            height: 250,
            transform: [{ scale: glowAnim }]
          }
        ]} 
      />

      <SafeAreaView edges={['top']} style={{ flex: 1 }}>
        {/* Style Toggle & Support Action Buttons */}
        <Animated.View style={[styles.topActions, { opacity: fadeAnim }]}>
          <DarkModeToggle
            initialState={isDarkCover}
            onToggle={(isDark) => dispatch(setTheme(isDark ? 'dark' : 'light'))}
          />

          <TouchableOpacity 
            style={[
              styles.supportButton, 
              { 
                backgroundColor: isDarkCover ? 'rgba(226, 43, 198, 0.15)' : 'rgba(226, 43, 198, 0.08)',
                borderColor: isDarkCover ? 'rgba(226, 43, 198, 0.35)' : 'rgba(226, 43, 198, 0.2)'
              }
            ]} 
            onPress={() => setIsSupportVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="headset-outline" size={16} color={primaryColor} />
            <Text style={[styles.supportText, { color: primaryColor }]}>Підтримка</Text>
          </TouchableOpacity>
        </Animated.View>

        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 40) }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header & Logo Section */}
            <Animated.View 
              style={[
                styles.headerSection, 
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }, { scale: logoScale }] 
                }
              ]}
            >
              <Text style={[styles.header, { color: textColor, marginTop: 40 }]}>K&M Restaurant</Text>
              <Text style={[styles.subHeader, { color: textMuted, marginBottom: 20 }]}>Преміум-доставка страв у вашому місті</Text>
            </Animated.View>

            {/* Login Glassmorphic Form Card */}
            <Animated.View 
              style={[
                styles.formCardWrapper, 
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }] 
                }
              ]}
            >
              <BlurView 
                intensity={isDarkCover ? 30 : 50} 
                tint={isDarkCover ? 'dark' : 'light'} 
                style={[
                  styles.formCard, 
                  { 
                    backgroundColor: isDarkCover ? 'rgba(21, 10, 33, 0.7)' : 'rgba(255, 255, 255, 0.65)',
                    borderColor: borderLight,
                    shadowColor: primaryColor,
                    shadowOpacity: isDarkCover ? 0.35 : 0.15,
                    shadowRadius: 16,
                    shadowOffset: { width: 0, height: 8 },
                    elevation: 8,
                  }
                ]}
              >
                <Text style={[styles.formTitle, { color: textColor }]}>Вхід в акаунт</Text>

                {/* Phone Input */}
                <View style={styles.inputContainer}>
                  <Text style={[styles.inputLabel, { color: textMuted }]}>Номер телефону</Text>
                  <View 
                    style={[
                      styles.inputWrapper, 
                      { 
                        backgroundColor: inputBg,
                        borderColor: isPhoneFocused ? borderActive : borderLight,
                        shadowColor: primaryColor,
                        shadowOpacity: isPhoneFocused ? 0.15 : 0,
                        shadowRadius: 8,
                        elevation: isPhoneFocused ? 4 : 0,
                      }
                    ]}
                  >
                    <Ionicons 
                      name="call-outline" 
                      size={20} 
                      color={isPhoneFocused ? primaryColor : textMuted} 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={[styles.input, { color: textColor }]}
                      value={phone}
                      onChangeText={handlePhoneChange}
                      keyboardType="phone-pad"
                      placeholderTextColor={textMuted}
                      editable={!isLoading}
                      onFocus={() => setIsPhoneFocused(true)}
                      onBlur={() => setIsPhoneFocused(false)}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputContainer}>
                  <View style={styles.labelRow}>
                    <Text style={[styles.inputLabel, { color: textMuted }]}>Пароль</Text>
                  </View>
                  <View 
                    style={[
                      styles.inputWrapper, 
                      { 
                        backgroundColor: inputBg,
                        borderColor: isPasswordFocused ? borderActive : borderLight,
                        shadowColor: primaryColor,
                        shadowOpacity: isPasswordFocused ? 0.15 : 0,
                        shadowRadius: 8,
                        elevation: isPasswordFocused ? 4 : 0,
                      }
                    ]}
                  >
                    <Ionicons 
                      name="lock-closed-outline" 
                      size={20} 
                      color={isPasswordFocused ? primaryColor : textMuted} 
                      style={styles.inputIcon} 
                    />
                    <TextInput
                      style={[styles.input, { color: textColor }]}
                      placeholder="Введіть ваш пароль"
                      placeholderTextColor={textMuted}
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!isLoading}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                    />
                    <TouchableOpacity 
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeIcon}
                    >
                      <Ionicons 
                        name={showPassword ? "eye-off-outline" : "eye-outline"} 
                        size={20} 
                        color={textMuted} 
                      />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Login Button with Glow Effect */}
                <TouchableOpacity
                  style={[
                    styles.button, 
                    { 
                      backgroundColor: primaryColor,
                      shadowColor: primaryColor,
                      opacity: isLoading ? 0.8 : 1
                    }
                  ]}
                  activeOpacity={0.8}
                  onPress={handleLogin}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <View style={styles.buttonInner}>
                      <Text style={styles.buttonText}>Увійти</Text>
                      <Ionicons name="arrow-forward" size={20} color="white" style={styles.buttonIcon} />
                    </View>
                  )}
                </TouchableOpacity>
              </BlurView>
            </Animated.View>

            {/* Footer Registration Link */}
            <Animated.View style={[styles.footerSection, { opacity: fadeAnim }]}>
              <TouchableOpacity onPress={() => router.push('/register')} style={styles.link} activeOpacity={0.6}>
                <Text style={[styles.linkText, { color: textMuted }]}>
                  Немає акаунту?{' '}
                  <Text style={[styles.linkHighlight, { color: primaryColor }]}>Створити новий</Text>
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
            <BlurView intensity={80} tint={isDarkCover ? 'dark' : 'light'} style={[styles.supportModal, { borderColor: borderLight }]}>
              <Text style={[styles.modalTitle, { color: textColor }]}>Допомога та підтримка</Text>

              <TouchableOpacity 
                style={[styles.supportOption, { backgroundColor: isDarkCover ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]} 
                onPress={() => openSupport('telegram')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#0088cc' }]}>
                  <Ionicons name="paper-plane" size={22} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: textColor }]}>Telegram Chat</Text>
                <Ionicons name="chevron-forward" size={18} color={textMuted} style={styles.optionChevron} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.supportOption, { backgroundColor: isDarkCover ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]} 
                onPress={() => openSupport('viber')}
              >
                <View style={[styles.iconCircle, { backgroundColor: '#7360f2' }]}>
                  <Ionicons name="chatbubble-ellipses" size={22} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: textColor }]}>Viber Support</Text>
                <Ionicons name="chevron-forward" size={18} color={textMuted} style={styles.optionChevron} />
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.supportOption, { backgroundColor: isDarkCover ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)' }]} 
                onPress={() => openSupport('email')}
              >
                <View style={[styles.iconCircle, { backgroundColor: primaryColor }]}>
                  <Ionicons name="mail" size={22} color="white" />
                </View>
                <Text style={[styles.supportOptionText, { color: textColor }]}>Email Support</Text>
                <Ionicons name="chevron-forward" size={18} color={textMuted} style={styles.optionChevron} />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.closeButton, { backgroundColor: isDarkCover ? '#221830' : '#f0eef5' }]}
                onPress={() => setIsSupportVisible(false)}
              >
                <Text style={[styles.closeButtonText, { color: textColor }]}>Скасувати</Text>
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
  backgroundLogo: {
    width: 220,
    height: 220,
  },
  glowCircle: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    zIndex: -1,
  },
  topActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 12,
    alignItems: 'center',
  },
  styleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
  },
  supportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 25,
    borderWidth: 1.5,
  },
  topActionsText: { marginLeft: 8, fontWeight: '800', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  supportText: { marginLeft: 8, fontWeight: '700', fontSize: 13 },
  scrollContent: { flexGrow: 1, paddingHorizontal: 24, paddingBottom: 40, justifyContent: 'center' },
  headerSection: { alignItems: 'center', marginTop: 15, marginBottom: 20 },
  logoContainer: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoImage: {
    width: '100%',
    height: '100%',
  },
  illustrationContainer: {
    width: 180,
    height: 110,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 4,
  },
  illustrationImage: {
    width: '80%',
    height: '80%',
  },
  header: { fontSize: 28, fontWeight: '900', letterSpacing: -0.5, marginBottom: 6 },
  subHeader: { fontSize: 14, fontWeight: '600', textAlign: 'center', opacity: 0.8 },
  formCardWrapper: { width: '100%', borderRadius: 28, overflow: 'hidden' },
  formCard: {
    padding: 24,
    borderRadius: 28,
    borderWidth: 1.5,
  },
  formTitle: { fontSize: 20, fontWeight: '800', marginBottom: 24, letterSpacing: -0.2 },
  inputContainer: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  inputLabel: { fontSize: 13, fontWeight: '700', paddingLeft: 4, marginBottom: 8 },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1.5,
  },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 0, textAlignVertical: 'center' },
  eyeIcon: { padding: 6 },
  button: {
    height: 58,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  buttonInner: { flexDirection: 'row', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 17, fontWeight: '800' },
  buttonIcon: { marginLeft: 8 },
  footerSection: { marginTop: 32, alignItems: 'center' },
  link: { padding: 12 },
  linkText: { fontSize: 15, fontWeight: '600' },
  linkHighlight: { fontWeight: '800' },

  // Modal Styles
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(5, 2, 10, 0.6)',
  },
  modalContentWrapper: {
    flex: 1,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingBottom: 40,
  },
  supportModal: {
    width: width - 32,
    borderRadius: 28,
    padding: 24,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '800',
    marginBottom: 20,
    textAlign: 'center',
    letterSpacing: -0.2,
  },
  supportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 18,
    marginBottom: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  supportOptionText: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
  },
  optionChevron: { opacity: 0.6 },
  closeButton: {
    marginTop: 8,
    height: 54,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
});