import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../../constants/Colors';
import { loginUser } from '../../store/authSlice';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  // 👇 ТУТ ЗАЛИШАЄМО "+380"
  const [phone, setPhone] = useState('+380');

  // 👇 ФУНКЦІЯ БЛОКУВАННЯ КОДУ
  const handlePhoneChange = (text) => {
    // Якщо пробують стерти "+380", вертаємо назад
    if (!text.startsWith('+380')) {
      setPhone('+380'); 
      return;
    }

    if (text.length > 13) return; // Ліміт довжини

    // Лишаємо тільки цифри
    const onlyNumbers = text.substring(1).replace(/[^0-9]/g, '');
    setPhone('+' + onlyNumbers);
  };

  const handleLogin = () => {
    if (phone.length < 13) {
      Alert.alert("Помилка", "Будь ласка, введіть повний номер телефону");
      return;
    }

    const mockUser = {
      name: 'Дмитро Тестовий',
      phone: phone,
      avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=500'
    };

    dispatch(loginUser(mockUser));
    router.replace('/profile');
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          
          <Text style={[styles.header, { color: theme.text }]}>Вхід у систему</Text>
          
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Номер телефону</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]} 
              
              // 👇 ТУТ ПРАЦЮЄ НАША ФУНКЦІЯ
              value={phone}
              onChangeText={handlePhoneChange}
              
              keyboardType="phone-pad"
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Пароль</Text>
            <TextInput 
              style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]} 
              placeholder="••••••" 
              placeholderTextColor={theme.textSecondary}
              secureTextEntry
              keyboardAppearance={isDark ? 'dark' : 'light'}
            />
          </View>

          <TouchableOpacity style={styles.button} activeOpacity={0.8} onPress={handleLogin}>
            <Text style={styles.buttonText}>УВІЙТИ</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.link}>
            <Text style={[styles.linkText, { color: theme.textSecondary }]}>
              Немає акаунту? <Text style={{ color: '#e334e3', fontWeight: 'bold' }}>Зареєструватись</Text>
            </Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { fontSize: 32, fontWeight: 'bold', marginBottom: 40, textAlign: 'center' },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 16, marginBottom: 8, fontWeight: '600' },
  input: { height: 56, borderWidth: 1, borderRadius: 14, paddingHorizontal: 16, fontSize: 18, fontWeight: '500' },
  button: { height: 56, backgroundColor: '#e334e3', borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 30, shadowColor: '#e334e3', shadowOpacity: 0.4, shadowRadius: 10, elevation: 5 },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 16 }
});