import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
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
import { uploadAvatar } from '../src/api/auth';
import { resolveImageUrl } from '../src/api/client';
import { updateUser, fetchMe } from '../store/authSlice';
import { safeBack } from '../utils/navigation';

export default function ProfileEditScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector((state) => state.language?.locale ?? 'uk');
  const { user } = useSelector((state) => state.auth);
  
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  // user.avatarUrl is the field from backend (MeResult)
  const currentAvatar = resolveImageUrl(user?.avatarUrl || user?.avatar);
  const [avatarUri, setAvatarUri] = useState(currentAvatar);
  const [isUploading, setIsUploading] = useState(false);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t(locale, 'error'), 'Нам потрібен доступ до вашої фотогалереї.');
      return;
    }

    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.4,
    });

    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (name.trim().length < 2) {
      Alert.alert(t(locale, 'error'), t(locale, 'errorNameShort'));
      return;
    }

    setIsUploading(true);
    try {
      // If avatar was changed (it's a local URI now)
      if (avatarUri && avatarUri !== currentAvatar) {
        const formData = new FormData();
        // ReactNative FormData file object
        formData.append('Photo', {
          uri: avatarUri,
          name: 'avatar.jpg',
          type: 'image/jpeg',
        });
        
        await uploadAvatar(formData);
      }

      // Sync user data with local store (name/phone logic would go here if backend supported it)
      dispatch(updateUser({ name, phone }));
      
      // Refresh full profile from backend to get the final avatarUrl
      await dispatch(fetchMe());

      Alert.alert(t(locale, 'profileUpdatedTitle'), t(locale, 'profileUpdated'), [
        { text: t(locale, 'ok'), onPress: () => safeBack(router) }
      ]);
    } catch (err) {
      console.error('[ProfileEdit] Save failed:', err);
      Alert.alert(t(locale, 'error'), 'Не вдалося оновити профіль. Спробуйте пізніше.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>

      {/* Шапка */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => safeBack(router)} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'editProfile')}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.content}>

        {/* Аватарка з кнопкою зміни */}
        <View style={styles.avatarContainer}>
          <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper} disabled={isUploading}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
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
            editable={!isUploading}
          />
          <Text style={[styles.label, { color: theme.textSecondary }]}>{t(locale, 'phone')}</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
            value={phone} onChangeText={setPhone}
            placeholder="+380..."
            placeholderTextColor="gray" keyboardType="phone-pad"
            editable={!isUploading}
          />
        </View>

        <TouchableOpacity 
          style={[styles.saveBtn, isUploading && { opacity: 0.7 }]} 
          onPress={handleSave}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.saveBtnText}>{t(locale, 'saveChanges')}</Text>
          )}
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