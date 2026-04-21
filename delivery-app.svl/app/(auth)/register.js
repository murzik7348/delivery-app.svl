import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { safeBack } from '../../utils/navigation';
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
  useColorScheme,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../../constants/Colors';
import { authStart, authVerify, authSetPassword, getMe } from '../../src/api';
import { loginUser } from '../../store/authSlice';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState(1);
  const totalSteps = 7; // added OTP step between phone and birthday
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

  const formattedPhone = `+380${phoneRaw}`;

  const isStepValid = () => {
    switch (step) {
      case 1: return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 2: return true;
      case 3: return phoneRaw.length === 9;
      case 4: return otpCode.length >= 4; // OTP step
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

  // ── Step 3 → send OTP ─────────────────────────────────────────────────────
  const sendOtp = async () => {
    setIsLoading(true);
    try {
      await authStart({ phoneNumber: formattedPhone });
      setStep(4); // move to OTP step
    } catch (err) {
      Alert.alert('Помилка', err.message || 'Не вдалося надіслати SMS. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  // ── Step 4 → verify OTP ───────────────────────────────────────────────────
  const verifyOtp = async () => {
    setIsLoading(true);
    try {
      // Token is auto-saved to AsyncStorage by authVerify
      await authVerify({ phoneNumber: formattedPhone, code: otpCode });
      setStep(5); // birthday
    } catch (err) {
      Alert.alert('Невірний код', err.message || 'Перевірте код та спробуйте знову.');
    } finally {
      setIsLoading(false);
    }
  };

  const nextStep = () => {
    Keyboard.dismiss();
    if (step === 1 && !isStepValid()) { Alert.alert('Увага', "Введіть ім'я та прізвище"); return; }
    if (step === 3) { sendOtp(); return; } // async
    if (step === 4) { verifyOtp(); return; } // async
    if (step === 6 && password.length < 6) { Alert.alert('Увага', 'Пароль надто короткий'); return; }
    if (step < totalSteps) setStep(step + 1);
  };

  const prevStep = () => {
    Keyboard.dismiss();
    if (step > 1) setStep(step - 1);
    else safeBack(router);
  };

  // ── Final submit ──────────────────────────────────────────────────────────
  const handleFinish = async (skipEmail) => {
    setIsLoading(true);
    try {
      // Set password on backend — API requires: name, password, confirmPassword, birthday
      const formattedBirthday = birthDate.toISOString().split('T')[0]; // YYYY-MM-DD
      const fullName = `${firstName} ${lastName}`.trim();
      try {
        await authSetPassword({
          name: fullName,
          password,
          confirmPassword: password,
          birthday: formattedBirthday,
        });
      } catch (err) {
        // If password is already set, we can ignore this error and just log the user in
        // (Status 400 + code "PASSWORD_ALREADY_SET" or generic 400 for password-related issues)
        const isAlreadySet = err.data?.code === 'PASSWORD_ALREADY_SET' || (err.status === 400 && err.message?.includes('already set'));
        if (isAlreadySet) {
          try {
            // Attempt login with the password the user just entered
            await authLogin({ phoneNumber: formattedPhone, password });
          } catch (loginErr) {
            // If login fails too, then we show the error
            throw loginErr;
          }
        } else {
          throw err;
        }
      }

      // Fetch the full user profile
      let me = null;
      try {
        // Pass _skipLogout: true to prevent auto-logout if /auth/me fails (e.g. token not yet fully active or intermittent 401)
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

  const renderNextButton = (customText = 'Далі') => {
    const valid = isStepValid();
    return (
      <TouchableOpacity
        style={[styles.mainBtn, { backgroundColor: valid ? '#e334e3' : theme.input }]}
        onPress={nextStep}
        activeOpacity={0.7}
        disabled={!valid || isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="white" />
        ) : (
          <Text style={[styles.btnText, { color: valid ? 'white' : 'gray' }]}>{customText}</Text>
        )}
      </TouchableOpacity>
    );
  };

  const renderStepContent = () => {
    const inputStyle = [
      styles.input,
      { backgroundColor: theme.input, color: theme.text, borderColor: theme.border },
    ];

    switch (step) {
      // ── Step 1: Name ────────────────────────────────────────────────────
      case 1:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Як вас звати?</Text>
            <Text style={styles.stepSubtitle}>Це ім'я будуть бачити кур'єри</Text>
            <TextInput style={inputStyle} placeholder="Ім'я" placeholderTextColor="gray" value={firstName} onChangeText={setFirstName} autoFocus returnKeyType="next" />
            <TextInput style={inputStyle} placeholder="Прізвище" placeholderTextColor="gray" value={lastName} onChangeText={setLastName} returnKeyType="done" onSubmitEditing={Keyboard.dismiss} />
            {renderNextButton()}
          </View>
        );

      // ── Step 2: Avatar ──────────────────────────────────────────────────
      case 2:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Фото профілю 📸</Text>
            <Text style={styles.stepSubtitle}>Щоб ми вас впізнали (необов'язково)</Text>
            <View style={{ alignItems: 'center', marginVertical: 20 }}>
              <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
                {avatar ? (
                  <Image source={{ uri: avatar }} style={styles.avatar} />
                ) : (
                  <View style={[styles.placeholderAvatar, { backgroundColor: theme.input }]}>
                    <Ionicons name="camera" size={50} color="#e334e3" />
                  </View>
                )}
                <View style={styles.addIconBadge}><Ionicons name="add" size={20} color="white" /></View>
              </TouchableOpacity>
              <Text style={{ color: 'gray', marginTop: 10 }}>Натисніть, щоб обрати</Text>
            </View>
            {renderNextButton(avatar ? 'Чудово! Далі' : 'Пропустити')}
          </View>
        );

      // ── Step 3: Phone ───────────────────────────────────────────────────
      case 3:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Ваш номер телефону 📱</Text>
            <Text style={styles.stepSubtitle}>Ми надішлемо код підтвердження</Text>
            <View style={[styles.phoneContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
              <View style={[styles.prefixBox, { backgroundColor: theme.card, borderRightColor: theme.border }]}>
                <Text style={[styles.prefixText, { color: theme.text }]}>🇺🇦 +380</Text>
              </View>
              <TextInput
                style={[styles.phoneInput, { color: theme.text }]}
                placeholder="XX XXX XX XX"
                placeholderTextColor="gray"
                keyboardType="number-pad"
                maxLength={9}
                value={phoneRaw}
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

      // ── Step 4: OTP (NEW) ───────────────────────────────────────────────
      case 4:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Код підтвердження 🔑</Text>
            <Text style={styles.stepSubtitle}>Введіть код, надісланий на {formattedPhone}</Text>
            <TextInput
              style={inputStyle}
              placeholder="0000"
              placeholderTextColor="gray"
              keyboardType="number-pad"
              maxLength={6}
              value={otpCode}
              onChangeText={setOtpCode}
              autoFocus
            />
            <TouchableOpacity onPress={() => setStep(3)} style={{ marginBottom: 16 }}>
              <Text style={{ color: '#e334e3', textAlign: 'center' }}>Змінити номер</Text>
            </TouchableOpacity>
            {renderNextButton('Підтвердити')}
          </View>
        );

      // ── Step 5: Birth date ──────────────────────────────────────────────
      case 5:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Дата народження 🎂</Text>
            <Text style={styles.stepSubtitle}>Оберіть дату в списку</Text>
            <View style={[styles.datePickerContainer, { backgroundColor: theme.input }]}>
              <DateTimePicker
                value={birthDate}
                mode="date"
                display="spinner"
                onChange={(event, selectedDate) => setBirthDate(selectedDate || birthDate)}
                locale="uk-UA"
                maximumDate={new Date()}
                style={{ height: 200 }}
                textColor={theme.text}
                themeVariant={colorScheme}
              />
            </View>
            {renderNextButton()}
          </View>
        );

      // ── Step 6: Password ────────────────────────────────────────────────
      case 6:
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Придумайте пароль 🔒</Text>
            <Text style={styles.stepSubtitle}>Мінімум 6 символів</Text>
            <View style={[styles.passwordContainer, { backgroundColor: theme.input, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Пароль"
                placeholderTextColor="gray"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
                autoFocus
                returnKeyType="done"
                onSubmitEditing={Keyboard.dismiss}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={24} color="gray" />
              </TouchableOpacity>
            </View>
            {renderNextButton()}
          </View>
        );

      // ── Step 7: Email (optional) ────────────────────────────────────────
      case 7: {
        const isEmpty = email.length === 0;
        const isValid = email.includes('@') && email.includes('.');
        const isButtonActive = isEmpty || isValid;
        return (
          <View>
            <Text style={[styles.stepTitle, { color: theme.text }]}>Електронна пошта 📧</Text>
            <Text style={styles.stepSubtitle}>Для чеків та акцій</Text>
            <TextInput
              style={inputStyle}
              placeholder="example@mail.com"
              placeholderTextColor="gray"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={Keyboard.dismiss}
            />
            <TouchableOpacity
              style={[styles.mainBtn, { backgroundColor: isButtonActive ? '#e334e3' : theme.input }]}
              onPress={() => { if (isButtonActive) handleFinish(isEmpty); }}
              activeOpacity={0.7}
              disabled={!isButtonActive || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text style={[styles.btnText, { color: isButtonActive ? 'white' : 'gray' }]}>
                  {isEmpty ? 'Пропустити' : 'Завершити реєстрацію'}
                </Text>
              )}
              {isValid && !isLoading && (
                <Ionicons name="checkmark-circle" size={20} color="white" style={{ marginLeft: 10 }} />
              )}
            </TouchableOpacity>
          </View>
        );
      }
      default: return null;
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={{ flexGrow: 1, padding: 24 }}>
            <TouchableOpacity onPress={prevStep} style={styles.backButton}>
              <Ionicons name="arrow-back" size={28} color={theme.text} />
            </TouchableOpacity>

            <View style={[styles.progressContainer, { backgroundColor: theme.border }]}>
              <View style={[styles.progressBar, { width: `${(step / totalSteps) * 100}%` }]} />
            </View>
            <Text style={styles.stepIndicator}>Крок {step} з {totalSteps}</Text>

            <View style={styles.content}>{renderStepContent()}</View>
          </ScrollView>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  backButton: { marginBottom: 20 },
  progressContainer: { height: 6, borderRadius: 3, marginBottom: 8, overflow: 'hidden' },
  progressBar: { height: '100%', backgroundColor: '#e334e3' },
  stepIndicator: { color: 'gray', marginBottom: 40, fontSize: 12, fontWeight: '600' },
  content: { flex: 1, justifyContent: 'center' },
  stepTitle: { fontSize: 28, fontWeight: 'bold', marginBottom: 10 },
  stepSubtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  input: { height: 56, borderRadius: 16, paddingHorizontal: 16, fontSize: 18, marginBottom: 20, borderWidth: 1 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 140, height: 140, borderRadius: 70, borderWidth: 4, borderColor: '#e334e3' },
  placeholderAvatar: { width: 140, height: 140, borderRadius: 70, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: '#e334e3', borderStyle: 'dashed' },
  addIconBadge: { position: 'absolute', bottom: 5, right: 10, backgroundColor: '#e334e3', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: 'white' },
  phoneContainer: { flexDirection: 'row', height: 56, borderRadius: 16, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  prefixBox: { justifyContent: 'center', paddingHorizontal: 15, borderRightWidth: 1 },
  prefixText: { fontSize: 18, fontWeight: 'bold' },
  phoneInput: { flex: 1, fontSize: 18, paddingHorizontal: 15 },
  passwordContainer: { flexDirection: 'row', height: 56, borderRadius: 16, borderWidth: 1, marginBottom: 20, alignItems: 'center', paddingRight: 15 },
  passwordInput: { flex: 1, height: '100%', paddingHorizontal: 16, fontSize: 18 },
  eyeBtn: { padding: 5 },
  datePickerContainer: { alignItems: 'center', justifyContent: 'center', marginBottom: 20, borderRadius: 16, overflow: 'hidden' },
  mainBtn: { height: 56, borderRadius: 16, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', marginTop: 10, elevation: 5 },
  btnText: { fontSize: 18, fontWeight: 'bold' },
});