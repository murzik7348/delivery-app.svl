import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput, TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { updateUser } from '../store/authSlice';

export default function ProfileEditScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector((state) => state.language?.locale ?? 'uk');
  const { user } = useSelector((state) => state.auth);
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatar, setAvatar] = useState(user?.avatar || null);
  const pickImage = async () => {
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

  const handleSave = () => {
    if (name.trim().length < 2) {
      Alert.alert(t(locale, 'error'), t(locale, 'errorNameShort'));
      return;
    }
    dispatch(updateUser({ name, phone, avatar }));
    Alert.alert(t(locale, 'profileUpdatedTitle'), t(locale, 'profileUpdated'), [
      { text: t(locale, 'ok'), onPress: () => router.back() }
    ]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'editProfile')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>

        {/* Аватарка з кнопкою зміни */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper}>
            {avatar ? (
              <Image source={{ uri: avatar }} style={styles.avatar} />
            ) : (
              <View style={[styles.placeholderAvatar, { backgroundColor: theme.input }]}>
                <Ionicons name="person" size={60} color="gray" />
              </View>
            )}
            {/* Значок камери поверх фото */}
            <View style={styles.cameraIcon}>
              <Ionicons name="camera" size={20} color="white" />
            </View>
          </TouchableOpacity>
          <Text style={[styles.hint, { color: theme.textSecondary }]}>{t(locale, 'tapToChange')}</Text>
        </View>

        {/* Поля вводу */}
        <View style={styles.form}>
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t(locale, 'yourName')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
            value={name} onChangeText={setName}
            placeholder={t(locale, 'namePlaceholder')}
            placeholderTextColor="gray"
          />
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t(locale, 'phone')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
            value={phone} onChangeText={setPhone}
            placeholder="+380..."
            placeholderTextColor="gray" keyboardType="phone-pad"
          />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t(locale, 'saveChanges')}</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20 },
  title: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 20, flex: 1 },

  avatarContainer: { alignItems: 'center', marginBottom: 30 },
  avatarWrapper: { position: 'relative' },
  avatar: { width: 120, height: 120, borderRadius: 60, borderWidth: 3, borderColor: '#e334e3' },
  placeholderAvatar: { width: 120, height: 120, borderRadius: 60, justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: '#e334e3' },
  cameraIcon: { position: 'absolute', bottom: 0, right: 0, backgroundColor: '#e334e3', padding: 8, borderRadius: 20, borderWidth: 3, borderColor: 'white' },
  hint: { marginTop: 10, fontSize: 12 },

  form: { marginBottom: 30 },
  label: { marginBottom: 8, fontSize: 14, fontWeight: '600' },
  input: { height: 50, borderRadius: 12, paddingHorizontal: 15, fontSize: 16, marginBottom: 20 },

  saveBtn: { backgroundColor: '#e334e3', padding: 18, borderRadius: 16, alignItems: 'center', elevation: 5 },
  saveBtnText: { color: 'white', fontSize: 18, fontWeight: 'bold' }
});