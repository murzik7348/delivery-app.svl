import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function AuthScreen() {
  // Налаштування для Google (сюди потім вставимо ID з консолі)
  // ({
  //   iosClientId: 'ТВІЙ_IOS_CLIENT_ID.apps.googleusercontent.com',
  //   androidClientId: 'ТВІЙ_ANDROID_CLIENT_ID.apps.googleusercontent.com',
  // });

  // Функція для Apple
  const handleAppleLogin = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      // Тут ми отримали дані юзера, можна пускати в додаток
      Alert.alert("Успіх!", `Вітаємо, ${credential.fullName.givenName}`);
    } catch (e) {
      if (e.code !== 'ERR_CANCELED') {
        Alert.alert("Помилка Apple", e.message);
      }
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Dima Delivery</Text>
        <Text style={styles.tagline}>Швидко. Просто. Смачно.</Text>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.appleBtn}>
          <Text style={styles.googleText}>Продовжити з Apple</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.googleBtn} onPress={() => promptAsync()}>
          <Text style={styles.googleText}>Продовжити з Google</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerText}>
        Натискаючи "Продовжити", ви погоджуєтесь з правилами сервісу.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff', padding: 25, justifyContent: 'space-between' },
  logoContainer: { marginTop: 100, alignItems: 'center' },
  logoText: { fontSize: 40, fontWeight: '900', color: '#FF6600' },
  tagline: { fontSize: 16, color: '#666', marginTop: 5 },
  buttonContainer: { marginBottom: 50 },
  appleBtn: { width: '100%', height: 56, marginBottom: 15 },
  googleBtn: { 
    width: '100%', 
    height: 56, 
    backgroundColor: '#fff', 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  googleText: { fontSize: 17, fontWeight: '600', color: '#000' },
  footerText: { textAlign: 'center', color: '#999', fontSize: 12, marginBottom: 30 }
});