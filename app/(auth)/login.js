import { useRouter } from 'expo-router';
import { useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import Colors from '../../constants/Colors';
import { authLogin } from '../../src/api';
import { loginUser } from '../../store/authSlice';

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();

  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const isDark = colorScheme === 'dark';

  const [phone, setPhone] = useState('+380');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
      // authLogin auto-saves the JWT to AsyncStorage
      const response = await authLogin({ phone, password });

      // Populate Redux with user data returned from the API
      const user = response?.user ?? response;
      dispatch(loginUser(user));
      router.replace('/(tabs)');
    } catch (err) {
      Alert.alert('Помилка входу', err.message || 'Щось пішло не так. Спробуйте ще раз.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>

          <Text style={[styles.header, { color: theme.text }]}>Вхід у систему</Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.text }]}>Номер телефону</Text>
            <TextInput
              style={[styles.input, { backgroundColor: theme.input, color: theme.text, borderColor: theme.border }]}
              value={phone}
              onChangeText={handlePhoneChange}
              keyboardType="phone-pad"
              keyboardAppearance={isDark ? 'dark' : 'light'}
              editable={!isLoading}
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
              value={password}
              onChangeText={setPassword}
              editable={!isLoading}
            />
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
              <Text style={styles.buttonText}>УВІЙТИ</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={() => router.push('/register')} style={styles.link}>
            <Text style={[styles.linkText, { color: theme.textSecondary }]}>
              Немає акаунту?{' '}
              <Text style={{ color: '#e334e3', fontWeight: 'bold' }}>Зареєструватись</Text>
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
  input: {
    height: 56,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    fontSize: 18,
    fontWeight: '500',
  },
  button: {
    height: 56,
    backgroundColor: '#e334e3',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 30,
    shadowColor: '#e334e3',
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold', letterSpacing: 1 },
  link: { marginTop: 24, alignItems: 'center' },
  linkText: { fontSize: 16 },
});