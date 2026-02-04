import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useDispatch } from 'react-redux';
import authService from '../../services/auth.service'; //
import { setCredentials } from '../../store/authSlice'; //

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch();
  const router = useRouter();

  const handleRegister = async () => {
    try {
      const response = await authService.register(email, password);
      dispatch(setCredentials({ user: response.user, token: response.token }));
    } catch (error) {
      Alert.alert("Сервер офлайн", "Зайти в тестовому режимі?", [
        { text: "Так", onPress: () => {
            dispatch(setCredentials({ user: { email: 'test@test.com' }, token: 'fake' }));
            router.replace('/(tabs)');
        }},
        { text: "Ні" }
      ]);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Створити акаунт 🍕</Text>
      <TextInput style={styles.input} placeholder="Email" value={email} onChangeText={setEmail} />
      <TextInput style={styles.input} placeholder="Пароль" secureTextEntry value={password} onChangeText={setPassword} />
      <TouchableOpacity style={styles.button} onPress={handleRegister}>
        <Text style={styles.buttonText}>Зареєструватися</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 30, justifyContent: 'center', backgroundColor: '#fff' },
  title: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#FF6600', textAlign: 'center' },
  input: { backgroundColor: '#f5f5f5', padding: 15, borderRadius: 12, marginBottom: 15 },
  button: { backgroundColor: '#FF6600', padding: 18, borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontSize: 18, fontWeight: 'bold' }
});