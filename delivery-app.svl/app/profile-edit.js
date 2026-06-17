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
  View,
  Platform,
  KeyboardAvoidingView,
  ScrollView
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { uploadAvatar } from '../src/api/auth';
import { resolveImageUrl } from '../src/api/client';
import { updateUser, fetchMe } from '../store/authSlice';
import BackButton from '../components/BackButton';
import { safeBack } from '../utils/navigation';
import { hs, vs, ms, fs, r, hairline } from '../utils/responsive';

export default function ProfileEditScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector((state) => state.language?.locale ?? 'uk');
  const { user } = useSelector((state) => state.auth);
  const insets = useSafeAreaInsets();
  
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
        <BackButton color={theme.text} />
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'editProfile')}</Text>
        <View style={{ width: 44 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.OS === 'android' ? 0 : 0}
      >
        <ScrollView 
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, 20) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Аватарка з кнопкою зміни */}
          <View style={styles.avatarContainer}>
            <TouchableOpacity onPress={pickImage} style={styles.avatarWrapper} disabled={isUploading}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={[styles.avatar, { borderColor: theme.primary }]} />
              ) : (
                <View style={[styles.placeholderAvatar, { backgroundColor: theme.input, borderColor: theme.primary }]}>
                  <Ionicons name="person" size={60} color="gray" />
                </View>
              )}
              {/* Значок камери поверх фото */}
              <View style={[styles.cameraIcon, { backgroundColor: theme.primary }]}>
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
            style={[styles.saveBtn, { backgroundColor: theme.primary }, isUploading && { opacity: 0.7 }]} 
            onPress={handleSave}
            disabled={isUploading}
          >
            {isUploading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.saveBtnText}>{t(locale, 'saveChanges')}</Text>
            )}
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: hs(20),
    paddingVertical: vs(12),
  },
  title: { fontSize: fs(20), fontWeight: 'bold' },
  content: { paddingHorizontal: hs(20), paddingTop: vs(8), flexGrow: 1 },

  avatarContainer: { alignItems: 'center', marginBottom: vs(30) },
  avatarWrapper: { position: 'relative' },
  avatar: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    borderWidth: hairline() * 3,
    borderColor: '#000000',
  },
  placeholderAvatar: {
    width: ms(120),
    height: ms(120),
    borderRadius: ms(60),
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: hairline() * 3,
    borderColor: '#000000',
  },
  cameraIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000000',
    padding: ms(8),
    borderRadius: r(20),
    borderWidth: hairline() * 3,
    borderColor: 'white',
  },
  hint: { marginTop: vs(10), fontSize: fs(12) },

  form: { marginBottom: vs(30) },
  label: { marginBottom: vs(8), fontSize: fs(14), fontWeight: '600' },
  input: {
    height: vs(50),
    borderRadius: r(12),
    paddingHorizontal: hs(15),
    fontSize: fs(16),
    marginBottom: vs(20),
    paddingVertical: 0,
    textAlignVertical: 'center',
  },

  saveBtn: {
    padding: ms(18),
    borderRadius: r(16),
    alignItems: 'center',
    elevation: 5,
  },
  saveBtnText: { color: 'white', fontSize: fs(18), fontWeight: 'bold' },
});