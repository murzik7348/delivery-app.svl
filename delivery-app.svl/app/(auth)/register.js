import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState, useEffect, useRef } from 'react';
import { safeBack } from '../../utils/navigation';
import BackButton from '../../components/BackButton';
import {
  ActivityIndicator,
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
  Dimensions,
  Animated,
} from 'react-native';
import { useColorScheme } from '../../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import { BlurView } from 'expo-blur';
import Colors from '../../constants/Colors';
import { authStart, authVerify, authSetPassword, getMe, authLogin } from '../../src/api';
import { loginUser } from '../../store/authSlice';

const { width } = Dimensions.get('window');

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const insets = useSafeAreaInsets();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [step, setStep] = useState(1);
  const totalSteps = 7;
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Focus states
  const [isFocused1, setIsFocused1] = useState(false);
  const [isFocused2, setIsFocused2] = useState(false);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const glowAnim = useRef(new Animated.Value(0.6)).current;

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

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1.1, duration: 4000, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.6, duration: 4000, useNativeDriver: true }),
      ])
    ).start();
  }, [step]);

  const formattedPhone = `+380${phoneRaw}`;

  const isStepValid = () => {
    switch (step) {
      case 1: return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 2: return true;
      case 3: return phoneRaw.length === 9;
      case 4: return otpCode.length >= 4;
      case 5: return true;
      case 6: return password.length >= 6;
      case 7: return true;
      default: return false;
    }
  };

  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert('Потрібен дозвіл', 'Дозвольте доступ до галереї.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });
    if (!result.canceled) setAvatar(result.assets[0].uri);
  };

  const sendOtp = async () => {
    setIsLoading(true);
    try {
      await authStart({ phoneNumber: formattedPhone });
      setStep(4);
    } catch (err) {
      Alert.alert('Помилка', err.message || 'Не вдалося надіслати SMS. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOtp = async () => {
    setIsLoading(true);
    try {
      await authVerify({ phoneNumber: formattedPhone, code: otpCode });
      setStep(5);
    } catch (err) {
      Alert.alert('Невірний код', err.message || 'Перевірте код та спробуйте знову.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    Keyboard.dismiss();
    if (step === 1 && !isStepValid()) { Alert.alert('Увага', "Введіть ім'я та прізвище"); return; }
    if (step === 3) { sendOtp(); return; }
    if (step === 4) { verifyOtp(); return; }
    if (step === 6 && password.length < 6) { Alert.alert('Увага', 'Пароль надто короткий'); return; }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    Keyboard.dismiss();
    if (step > 1) setStep(step - 1);
    else safeBack(router);
  };

  const handleFinish = async (skipEmail) => {
    setIsLoading(true);
    try {
      const formattedBirthday = birthDate.toISOString().split('T')[0];
      const fullName = `${firstName} ${lastName}`.trim();
      try {
        await authSetPassword({
          name: fullName,
          password,
          confirmPassword: password,
          birthday: formattedBirthday,
        });
      } catch (err) {
        const isAlreadySet = err.data?.code === 'PASSWORD_ALREADY_SET' || (err.status === 400 && err.message?.includes('already set'));
        if (isAlreadySet) {
          try {
            await authLogin({ phoneNumber: formattedPhone, password });
          } catch (loginErr) {
            throw loginErr;
          }
        } else {
          throw err;
        }
      }

      let me = null;
      try {
        me = await getMe({ _skipLogout: true });
      } catch (meError) {
        console.warn('Failed to fetch profile after password set:', meError.message);
      }

      const finalUser = {
        ...me,
        name: me?.name || `${firstName} ${lastName}`,
        email: skipEmail ? null : email,
        avatar: me?.avatar ?? avatar,
      };

      dispatch(loginUser(finalUser));
      Alert.alert('Вітаємо! 🎉', 'Реєстрацію успішно завершено!', [
        { text: 'Почати', onPress: () => router.replace('/home') },
      ]);
    } catch (err) {
      Alert.alert('Помилка реєстрації', err.message || 'Щось пішло не так.');
    } finally {
      setIsLoading(false);
    }
  };

  // Premium colors
  const activeBg = isDark ? '#171717' : '#FFFFFF';
  const inputBg = isDark ? 'rgba(21, 10, 33, 0.8)' : 'rgba(255, 255, 255, 0.9)';
  const primaryColor = isDark ? '#FFFFFF' : '#000000';
  const textColor = isDark ? '#ffffff' : '#0a0514';
  const textMuted = isDark ? '#a099aa' : '#6c627a';
  const borderLight = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(10, 5, 20, 0.06)';
  const borderActive = primaryColor;
  const buttonContentColor = isDark ? '#000000' : '#FFFFFF';

  const renderNextButton = (customText = 'Далі') => {
    const valid = isStepValid();
    return (
      <TouchableOpacity
        style={[
          styles.mainBtn,
          {
            backgroundColor: valid ? primaryColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
            shadowColor: primaryColor,
            shadowOpacity: valid ? 0.35 : 0,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: valid ? 8 : 0,
            opacity: isLoading ? 0.8 : 1,
          }
        ]}
        onPress={nextStep}
        activeOpacity={0.7}
        disabled={!valid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color={buttonContentColor} />
        ) : (
          <View style={styles.btnInner}>
            <Text style={[styles.btnText, { color: valid ? buttonContentColor : textMuted }]}>{customText}</Text>
            {valid && <Ionicons name="arrow-forward" size={18} color={buttonContentColor} style={{ marginLeft: 6 }} />}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderStepContent = () => {
    switch (step) {
      case 1:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Як вас звати?</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Це ім'я будуть бачити наші кур'єри</Text>
            
            <View style={[styles.inputWrapper, { 
              backgroundColor: inputBg, 
              borderColor: isFocused1 ? borderActive : borderLight,
              marginBottom: 16 
            }]}>
              <Ionicons name="person-outline" size={20} color={isFocused1 ? primaryColor : textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Ім'я"
                placeholderTextColor={textMuted}
                value={firstName}
                onChangeText={setFirstName}
                autoFocus
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                returnKeyType="next"
              />
            </View>

            <View style={[styles.inputWrapper, { 
              backgroundColor: inputBg, 
              borderColor: isFocused2 ? borderActive : borderLight,
              marginBottom: 24 
            }]}>
              <Ionicons name="person-outline" size={20} color={isFocused2 ? primaryColor : textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="Прізвище"
                placeholderTextColor={textMuted}
                value={lastName}
                onChangeText={setLastName}
                onFocus={() => setIsFocused2(true)}
                onBlur={() => setIsFocused2(false)}
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            {renderNextButton()}
          </View>
        );

      case 2:
        return (
          <View style={{ alignItems: 'center' }}>
            <Text style={[styles.stepTitle, { color: textColor, textAlign: 'center' }]}>Фото профілю 📸</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted, textAlign: 'center' }]}>Додайте фото, щоб ми вас впізнали</Text>
            
            <View style={{ alignItems: 'center', marginVertical: 30 }}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper} activeOpacity={0.8}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={[styles.avatar, { borderColor: primaryColor }]} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: inputBg, borderColor: primaryColor }]}>
                    <Ionicons name="camera" size={44} color={primaryColor} />
                  </View>
                )}
                <View style={[styles.addIconBadge, { backgroundColor: primaryColor }]}>
                  <Ionicons name="add" size={18} color="white" />
                </View>
              </TouchableOpacity>
              <Text style={{ color: textMuted, marginTop: 14, fontWeight: '600' }}>Натисніть, щоб обрати</Text>
            </View>
            {renderNextButton(avatar ? 'Чудово! Далі' : 'Пропустити')}
          </View>
        );

      case 3:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Номер телефону 📱</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Ми надішлемо код підтвердження в SMS</Text>
            
            <View style={[styles.phoneContainer, { backgroundColor: inputBg, borderColor: isFocused1 ? borderActive : borderLight }]}>
              <View style={[styles.prefixBox, { borderRightColor: borderLight }]}>
                <Text style={[styles.prefixText, { color: textColor }]}>🇺🇦 +380</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: textColor }]}
                placeholder="XX XXX XX XX"
                placeholderTextColor={textMuted}
                keyboardType="number-pad"
                maxLength={9}
                value={phoneRaw}
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                onChangeText={(text) => {
                  setPhoneRaw(text);
                  if (text.length === 9) Keyboard.dismiss();
                }}
                autoFocus
              />
            </View>
            {renderNextButton('Надіслати код')}
          </View>
        );

      case 4:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Код з SMS 🔑</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Введіть код, надісланий на {formattedPhone}</Text>
            
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isFocused1 ? borderActive : borderLight, marginBottom: 16 }]}>
              <Ionicons name="key-outline" size={20} color={isFocused1 ? primaryColor : textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor, letterSpacing: 8, fontSize: 20 }]}
                placeholder="0000"
                placeholderTextColor={textMuted}
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                onChangeText={setOtpCode}
                autoFocus
              />
            </View>
            <TouchableOpacity onPress={() => setStep(3)} style={{ marginBottom: 20 }} activeOpacity={0.6}>
              <Text style={{ color: primaryColor, textAlign: 'center', fontWeight: '700' }}>Змінити номер телефону</Text>
            </TouchableOpacity>
            {renderNextButton('Підтвердити')}
          </View>
        );

      case 5:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Дата народження 🎂</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Будь ласка, вкажіть вашу дату народження</Text>
            
            <View style={[styles.datePickerContainer, { backgroundColor: inputBg, borderColor: borderLight }]}>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => setBirthDate(selectedDate || birthDate)}
                locale="uk-UA"
                maximumDate={new Date()}
                style={{ height: 180, width: '100%' }}
                textColor={textColor}
                themeVariant={colorScheme}
              />
            </View>
            {renderNextButton()}
          </View>
        );

      case 6:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Придумайте пароль 🔒</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Створіть надійний пароль (мінімум 6 символів)</Text>
            
            <View style={[styles.passwordContainer, { backgroundColor: inputBg, borderColor: isFocused1 ? borderActive : borderLight }]}>
              <Ionicons name="lock-closed-outline" size={20} color={isFocused1 ? primaryColor : textMuted} style={{ marginRight: 12 }} />
              <TextInput
                style={[styles.passwordInput, { color: textColor }]}
                placeholder="Пароль"
                placeholderTextColor={textMuted}
                secureTextEntry={!showPassword}
                value={password}
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                onChangeText={setPassword}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={22} color={textMuted} />
              </TouchableOpacity>
            </View>
            {renderNextButton()}
          </View>
        );

      case 7: {
        const isEmpty = email.length === 0;
        const isValid = email.includes('@') && email.includes('.');
        const isButtonActive = isEmpty || isValid;
        return (
          <View>
            <Text style={[styles.stepTitle, { color: textColor }]}>Електронна пошта 📧</Text>
            <Text style={[styles.stepSubtitle, { color: textMuted }]}>Для отримання чеків та персональних знижок</Text>
            
            <View style={[styles.inputWrapper, { backgroundColor: inputBg, borderColor: isFocused1 ? borderActive : borderLight, marginBottom: 24 }]}>
              <Ionicons name="mail-outline" size={20} color={isFocused1 ? primaryColor : textMuted} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, { color: textColor }]}
                placeholder="example@mail.com"
                placeholderTextColor={textMuted}
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onFocus={() => setIsFocused1(true)}
                onBlur={() => setIsFocused1(false)}
                onChangeText={setEmail}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
            </View>
            <TouchableOpacity
              style={[
                styles.mainBtn,
                {
                  backgroundColor: isButtonActive ? primaryColor : (isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'),
                  shadowColor: primaryColor,
                  shadowOpacity: isButtonActive ? 0.35 : 0,
                  shadowRadius: 16,
                  shadowOffset: { width: 0, height: 8 },
                  elevation: isButtonActive ? 8 : 0,
                  opacity: isLoading ? 0.8 : 1,
                }
              ]}
              onPress={() => { if (isButtonActive) handleFinish(isEmpty); }}
              activeOpacity={0.7}
              disabled={!isButtonActive || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={buttonContentColor} />
              ) : (
                <View style={styles.btnInner}>
                  <Text style={[styles.btnText, { color: isButtonActive ? buttonContentColor : textMuted }]}>
                    {isEmpty ? 'Пропустити' : 'Завершити реєстрацію'}
                  </Text>
                  {isButtonActive && <Ionicons name="checkmark-circle-outline" size={18} color={buttonContentColor} style={{ marginLeft: 6 }} />}
                </View>
              )}
            </TouchableOpacity>
          </View>
        );
      }
      default: return null;
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: activeBg }]}>
      {/* Centered Watermark Logo (matches current theme color) */}
      <View style={[StyleSheet.absoluteFillObject, styles.logoBackgroundContainer]}>
        <Image
          source={isDark ? require('../../assets/images/logo_dark.png') : require('../../assets/images/logo_light.png')}
          style={styles.backgroundLogo}
          resizeMode="contain"
        />
      </View>

      {/* Background Decorative Glowing Elements */}
      <Animated.View 
        style={[
          styles.glowCircle, 
          { 
            top: -50, 
            right: -50, 
            backgroundColor: primaryColor, 
            opacity: 0.15,
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
            opacity: 0.12, 
            width: 250, 
            height: 250,
            transform: [{ scale: glowAnim }]
          }
        ]} 
      />

      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView 
            contentContainerStyle={{ flexGrow: 1, padding: 24, paddingBottom: Math.max(insets.bottom, 24) }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Header controls */}
            <View style={styles.headerControls}>
              <View style={styles.backButton}>
                <BackButton color={textColor} onPress={prevStep} />
              </View>
              <Text style={[styles.stepIndicator, { color: textMuted }]}>Крок {step} з {totalSteps}</Text>
            </View>

            {/* Glassmorphic Progress Tracker */}
            <View style={[styles.progressContainer, { backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]}>
              <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%`, backgroundColor: primaryColor }]} />
            </View>

            {/* Dynamic Step Content Card Wrapped in BlurView */}
            <Animated.View 
              style={[
                styles.contentCardWrapper, 
                { 
                  opacity: fadeAnim, 
                  transform: [{ translateY: slideAnim }],
                  borderColor: borderLight,
                }
              ]}
            >
              <BlurView
                intensity={isDark ? 30 : 50}
                tint={isDark ? 'dark' : 'light'}
                style={[
                  styles.contentCard,
                  {
                    backgroundColor: isDark ? 'rgba(21, 10, 33, 0.7)' : 'rgba(255, 255, 255, 0.65)',
                  }
                ]}
              >
                {renderStepContent()}
              </BlurView>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, overflow: 'hidden' },
  glowCircle: {
    position: 'absolute',
    width: 350,
    height: 350,
    borderRadius: 175,
    zIndex: -1,
  },
  headerControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepIndicator: { fontSize: 13, fontWeight: '700' },
  progressContainer: { height: 6, borderRadius: 3, marginBottom: 30, overflow: 'hidden' },
  progressBar: { height: '100%' },
  contentCardWrapper: {
    flex: 1,
    borderRadius: 28,
    overflow: 'hidden',
    borderWidth: 1.5,
  },
  contentCard: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
  },
  logoBackgroundContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: -1,
  },
  backgroundLogo: {
    width: 220,
    height: 220,
    opacity: 0.12,
  },
  stepTitle: { fontSize: 24, fontWeight: '900', marginBottom: 6, letterSpacing: -0.5 },
  stepSubtitle: { fontSize: 14, fontWeight: '600', marginBottom: 26, opacity: 0.8 },
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
  avatarWrapper: { position: 'relative' },
  avatar: { width: 130, height: 130, borderRadius: 65, borderWidth: 4 },
  placeholderAvatar: { width: 130, height: 130, borderRadius: 65, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderStyle: 'dashed' },
  addIconBadge: { position: 'absolute', bottom: 2, right: 6, padding: 6, borderRadius: 18, borderWidth: 3, borderColor: 'white' },
  phoneContainer: { flexDirection: 'row', height: 58, borderRadius: 16, borderWidth: 1.5, marginBottom: 24, overflow: 'hidden', alignItems: 'center' },
  prefixBox: { justifyContent: 'center', paddingHorizontal: 16, borderRightWidth: 1.5 },
  prefixText: { fontSize: 16, fontWeight: '800' },
  phoneInput: { flex: 1, fontSize: 16, paddingHorizontal: 16, fontWeight: '600', paddingVertical: 0, textAlignVertical: 'center' },
  passwordContainer: { flexDirection: 'row', height: 58, borderRadius: 16, borderWidth: 1.5, marginBottom: 24, alignItems: 'center', paddingHorizontal: 16 },
  passwordInput: { flex: 1, height: '100%', fontSize: 16, fontWeight: '600', paddingVertical: 0, textAlignVertical: 'center' },
  eyeBtn: { padding: 6 },
  datePickerContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 24, borderRadius: 18, overflow: 'hidden', borderWidth: 1.5 },
  mainBtn: { height: 58, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  btnInner: { flexDirection: 'row', alignItems: 'center' },
  btnText: { fontSize: 16, fontWeight: '800' },
});