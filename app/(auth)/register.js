import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  Keyboard,
  KeyboardAvoidingView, Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  TouchableWithoutFeedback, useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../../constants/Colors';
import { loginUser } from '../../store/authSlice';

export default function RegisterScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const [step, setStep] = useState(1);
  const totalSteps = 6;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [avatar, setAvatar] = useState(null);
  const [phoneRaw, setPhoneRaw] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [birthDate, setBirthDate] = useState(new Date(2000, 0, 1));
  const [showPassword, setShowPassword] = useState(false);
  const isStepValid = () => {
    switch (step) {
      case 1: return firstName.trim().length > 0 && lastName.trim().length > 0;
      case 2: return true; 
      case 3: return phoneRaw.length === 9; 
      case 4: return true; 
      case 5: return password.length >= 6; 
      case 6: return true;
      default: return false;
    }
  };
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissionResult.granted === false) {
      Alert.alert("Потрібен дозвіл", "Дозвольте доступ до галереї.");
      return;
    }
    
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 1,
    });

    if (!result.canceled) {
      setAvatar(result.assets[0].uri);
    }
  };
  const nextStep = () => {
    Keyboard.dismiss(); 
    if (step === 1 && !isStepValid()) { Alert.alert("Увага", "Введіть ім'я та прізвище"); return; }
    if (step === 3 && phoneRaw.length < 9) { Alert.alert("Увага", "Номер неповний"); return; }
    if (step === 5 && password.length < 6) { Alert.alert("Увага", "Пароль надто короткий"); return; }
    
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const prevStep = () => {
    Keyboard.dismiss();
    if (step > 1) setStep(step - 1);
    else router.back();
  };

  const handleFinish = (skipEmail) => {
    const finalEmail = skipEmail ? 'Не вказано' : email;
    const formattedPhone = `+380${phoneRaw}`;
    const formattedDate = birthDate.toLocaleDateString('uk-UA');

    const newUser = {
      name: `${firstName} ${lastName}`,
      phone: formattedPhone,
      email: finalEmail,
      birthDate: formattedDate,
      avatar: avatar,
    };
    dispatch(loginUser(newUser));
    Alert.alert("Вітаємо! 🎉", "Реєстрацію успішно завершено!", [{ text: "Почати", onPress: () => router.replace('/(tabs)') }]);
  };
  const renderNextButton = (customText = "Далі") => {
    const valid = isStepValid();
    return (
      <TouchableOpacity 
        style={[styles.mainBtn, { backgroundColor: valid ? '#e334e3' : (theme.input) }]} 
        onPress={nextStep}
        activeOpacity={0.7}
        disabled={!valid}
      >
        <Text style={[styles.btnText, { color: valid ? 'white' : 'gray' }]}>
          {customText}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderStepContent = () => {
    const inputStyle = [styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }];
    
    switch (step) {
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
                  <View style={[styles.placeholderAvatar, { backgroundColor: theme.input }]}><Ionicons name="camera" size={50} color="#e334e3" /></View>
                )}
                <View style={styles.addIconBadge}><Ionicons name="add" size={20} color="white" /></View>
              </TouchableOpacity>
              <Text style={{color: 'gray', marginTop: 10}}>Натисніть, щоб обрати</Text>
            </View>
            {renderNextButton(avatar ? "Чудово! Далі" : "Пропустити")}
          </View>
        );

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
            {renderNextButton()}
          </View>
        );

      case 4:
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

      case 5:
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
                  <Ionicons name={showPassword ? "eye-off" : "eye"} size={24} color="gray" />
              </TouchableOpacity>
            </View>
            {renderNextButton()}
          </View>
        );

      case 6:
        // 👇 ТУТ ТВОЯ ЛОГІКА
        const isEmpty = email.length === 0;
        const isValid = email.includes('@') && email.includes('.com');
        
        // Кнопка горить, якщо ПУСТО (щоб пропустити) АБО ВАЛІДНО (щоб зберегти)
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
              onPress={() => {
                if (isButtonActive) {
                  // Якщо пусто -> skipEmail=true, якщо валідно -> skipEmail=false
                  handleFinish(isEmpty); 
                }
              }}
              activeOpacity={0.7}
              disabled={!isButtonActive}
            >
              <Text style={[styles.btnText, { color: isButtonActive ? 'white' : 'gray' }]}>
                {isEmpty ? "Пропустити" : "Завершіть реєстрацію"}
              </Text>
              {isValid && <Ionicons name="checkmark-circle" size={20} color="white" style={{marginLeft: 10}} />}
            </TouchableOpacity>
          </View>
        );
      default: return null;
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
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