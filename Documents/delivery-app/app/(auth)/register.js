import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, useColorScheme, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Colors from '../../constants/Colors';

export default function RegisterScreen() {
  const router = useRouter();
  
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light']; 
  const isDark = colorScheme === 'dark';

  const defaultDate = new Date('2000-01-01');

  const { control, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: {
      name: '',
      // 👇 1. ПОВЕРНУЛИ +380 ЯК СТАРТОВЕ ЗНАЧЕННЯ
      phone: '+380', 
      email: '',
      password: '',
      birthDate: defaultDate 
    }
  });

  const [showPicker, setShowPicker] = useState(false);
  const [date, setDate] = useState(defaultDate);

  const onDateChange = (event, selectedDate) => {
    const currentDate = selectedDate || date;
    if (Platform.OS === 'android') setShowPicker(false);
    setDate(currentDate);
    setValue('birthDate', currentDate);
  };

  const closeIosDatePicker = () => {
    setShowPicker(false);
  };

  const onSubmit = (data) => {
    if (data.phone.length < 13) {
      Alert.alert("Помилка", "Введіть коректний номер телефону (12 цифр)");
      return;
    }
    
    console.log("Дані:", data);
    Alert.alert("Успіх", "Акаунт створено!", [
      { text: "OK", onPress: () => router.replace('/(auth)/login') }
    ]);
  };

  const formatDate = (dateObj) => {
    if (!dateObj || !(dateObj instanceof Date)) return 'Оберіть дату';
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // 👇 2. ПОВЕРНУЛИ ФУНКЦІЮ БЛОКУВАННЯ КОДУ
  const handlePhoneInput = (text, onChange) => {
    // Не даємо стерти код країни
    if (!text.startsWith('+380')) {
      onChange('+380');
      return;
    }
    // Максимум 13 символів
    if (text.length > 13) return;

    // Лишаємо тільки цифри після плюса
    const onlyNumbers = text.substring(1).replace(/[^0-9]/g, '');
    onChange('+' + onlyNumbers);
  };

  const RenderField = ({ name, label, icon, isRequired, isPassword, isDate }) => {
    const isPhone = name === 'phone';

    return (
      <View style={styles.inputContainer}>
        <View style={styles.labelRow}>
          <Text style={[styles.label, { color: theme.text }]}>{label}</Text>
          {isRequired && <Text style={styles.star}>*</Text>}
        </View>

        <Controller
          control={control}
          name={name}
          rules={{ required: isRequired ? `Це поле обов'язкове` : false }}
          render={({ field: { onChange, value } }) => (
            <View>
              {isDate ? (
                <TouchableOpacity 
                  onPress={() => setShowPicker(true)} 
                  style={[styles.inputWrapper, { backgroundColor: theme.input, borderColor: theme.border }]}
                >
                  <Ionicons name="calendar-outline" size={20} color={theme.textSecondary} style={styles.icon} />
                  <Text style={[styles.inputText, { color: theme.text }]}>
                    {formatDate(date)} 
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[
                  styles.inputWrapper, 
                  { backgroundColor: theme.input, borderColor: errors[name] ? 'red' : theme.border },
                  errors[name] && styles.errorBorder
                ]}>
                  <Ionicons name={icon} size={20} color={theme.textSecondary} style={styles.icon} />
                  <TextInput
                    style={[
                      styles.input, 
                      { color: theme.text },
                      isPhone && { fontSize: 18, fontWeight: '500' } // Жирніший шрифт для телефону
                    ]}
                    placeholder={label}
                    placeholderTextColor={theme.textSecondary}
                    value={value}
                    
                    // 👇 ТУТ ВИКЛИКАЄМО НАШУ ФУНКЦІЮ
                    onChangeText={(text) => {
                      if (isPhone) {
                        handlePhoneInput(text, onChange);
                      } else {
                        onChange(text);
                      }
                    }}
                    
                    secureTextEntry={isPassword}
                    keyboardType={isPhone ? "phone-pad" : "default"}
                    keyboardAppearance={isDark ? 'dark' : 'light'}
                  />
                </View>
              )}
            </View>
          )}
        />
        {errors[name] && <Text style={styles.errorText}>{errors[name].message}</Text>}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>

          <Text style={[styles.title, { color: theme.text }]}>Реєстрація</Text>
          <Text style={styles.subtitle}>Заповніть анкету</Text>

          <RenderField name="name" label="Ім'я" icon="person-outline" isRequired={true} />
          
          {/* Телефон з +380 */}
          <RenderField name="phone" label="Телефон" icon="call-outline" isRequired={true} />
          
          <RenderField name="birthDate" label="Дата народження" icon="calendar-outline" isRequired={true} isDate={true} />

          {/* Date Picker Logic */}
          {showPicker && (
            Platform.OS === 'ios' ? (
              <Modal transparent={true} animationType="slide">
                <View style={[styles.modalOverlay, { backgroundColor: theme.modalOverlay }]}>
                  <View style={[styles.iosPickerContainer, { backgroundColor: theme.card }]}>
                    <View style={[styles.iosHeader, { backgroundColor: theme.input, borderColor: theme.border }]}>
                      <TouchableOpacity onPress={closeIosDatePicker}>
                        <Text style={styles.doneBtn}>Готово</Text>
                      </TouchableOpacity>
                    </View>
                    <DateTimePicker
                      value={date}
                      mode="date"
                      display="spinner"
                      onChange={onDateChange}
                      maximumDate={new Date()} 
                      minimumDate={new Date('1900-01-01')}
                      locale="uk-UA"
                      textColor={theme.text} 
                      themeVariant={isDark ? 'dark' : 'light'} 
                    />
                  </View>
                </View>
              </Modal>
            ) : (
              <DateTimePicker
                value={date}
                mode="date"
                display="default"
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date('1900-01-01')}
                themeVariant={isDark ? 'dark' : 'light'}
              />
            )
          )}

          <RenderField name="email" label="Email (необов'язково)" icon="mail-outline" isRequired={false} />
          <RenderField name="password" label="Пароль" icon="lock-closed-outline" isRequired={true} isPassword={true} />

          <TouchableOpacity style={[styles.button, { backgroundColor: isDark ? '#fff' : '#000' }]} onPress={handleSubmit(onSubmit)}>
            <Text style={[styles.buttonText, { color: isDark ? '#000' : '#fff' }]}>Створити акаунт</Text>
          </TouchableOpacity>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 24, paddingBottom: 50 },
  backBtn: { marginBottom: 20 },
  title: { fontSize: 32, fontWeight: 'bold', marginBottom: 5 },
  subtitle: { fontSize: 16, color: 'gray', marginBottom: 30 },
  inputContainer: { marginBottom: 20 },
  labelRow: { flexDirection: 'row', marginBottom: 6 },
  label: { fontSize: 14, fontWeight: '600' },
  star: { color: 'red', marginLeft: 4, fontWeight: 'bold' },
  inputWrapper: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, paddingHorizontal: 14, height: 50, borderWidth: 1 },
  errorBorder: { borderColor: 'red', backgroundColor: '#fff0f0' },
  icon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, height: '100%' },
  inputText: { fontSize: 16 },
  errorText: { color: 'red', fontSize: 12, marginTop: 4 },
  button: { height: 56, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginTop: 20 },
  buttonText: { fontSize: 18, fontWeight: 'bold' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' },
  iosPickerContainer: { paddingBottom: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  iosHeader: { padding: 16, alignItems: 'flex-end', borderBottomWidth: 1, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  doneBtn: { color: '#007AFF', fontSize: 18, fontWeight: 'bold' }
});