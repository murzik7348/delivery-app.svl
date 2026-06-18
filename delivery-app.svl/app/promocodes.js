import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert, FlatList, Keyboard, StyleSheet, Text, TextInput,
  TouchableOpacity, View, Platform
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useColorScheme } from '../hooks/use-color-scheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';
import { applyDiscount } from '../store/cartSlice';
import BackButton from '../components/BackButton';

export default function PromocodesScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');
  const insets = useSafeAreaInsets();

  const [code, setCode] = useState('');
  const promos = [
    { id: '1', code: 'SALE10', discount: '10%', desc: locale === 'en' ? 'On entire order' : 'На все замовлення', color: '#FF4757' },
    { id: '2', code: 'BURGER50', discount: '50₴', desc: locale === 'en' ? 'Burger discount' : 'Знижка на бургери', color: '#2ED573' },
    { id: '3', code: 'FREEFOOD', discount: '🛵 0₴', desc: locale === 'en' ? 'Free delivery' : 'Безкоштовна доставка', color: '#1E90FF' },
  ];

  const handleApplyPromo = (promoCode = code) => {
    Keyboard.dismiss();
    const activeCode = promoCode.trim().toUpperCase();
    if (activeCode === '') return;
    const foundPromo = promos.find(p => p.code === activeCode);
    if (foundPromo) {
      let type = 'percent', discountValue = 0;
      if (foundPromo.discount.includes('%')) {
        type = 'percent';
        discountValue = parseInt(foundPromo.discount.replace(/\D/g, ''), 10);
      } else {
        type = 'fixed';
        discountValue = parseInt(foundPromo.discount.replace(/\D/g, ''), 10);
      }
      dispatch(applyDiscount({ code: foundPromo.code, type, discount: discountValue }));
      Alert.alert(t(locale, 'successPromo'), `"${foundPromo.code}" — ${t(locale, 'promoApplied')}`);
      setCode('');
      router.back();
    } else {
      Alert.alert(t(locale, 'error'), t(locale, 'promoNotFound'));
    }
  };

  const copyToClipboard = async (promoCode) => {
    try {
      await Clipboard.setStringAsync(promoCode);
      Alert.alert(locale === 'en' ? 'Copied!' : 'Скопійовано!', `"${promoCode}" ${locale === 'en' ? 'copied to clipboard' : 'скопійовано в буфер обміну'}`);
    } catch (err) {
      console.warn('Clipboard error:', err);
    }
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: theme.background }]}>
      {/* HEADER */}
      <View style={styles.header}>
        <BackButton color={theme.text} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>{t(locale, 'promoCodesTitle')}</Text>
        <View style={{ width: 32 }} />
      </View>

      <View style={styles.content}>
        {/* INPUT SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>
          {locale === 'en' ? 'ENTER PROMO CODE' : 'ВВЕДІТЬ ПРОМОКОД'}
        </Text>
        <View style={styles.inputRow}>
          <View style={[styles.inputWrapper, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="ticket-outline" size={22} color={theme.primary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: theme.text }]}
              placeholder={t(locale, 'enterCode')}
              placeholderTextColor={theme.textSecondary}
              value={code}
              onChangeText={setCode}
              autoCapitalize="characters"
              returnKeyType="done"
              onSubmitEditing={() => handleApplyPromo()}
            />
            {code.length > 0 && (
              <TouchableOpacity onPress={() => setCode('')} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={18} color={theme.textSecondary} />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity 
            style={[styles.applyBtn, { backgroundColor: theme.primary, opacity: code.trim() ? 1 : 0.6 }]} 
            onPress={() => handleApplyPromo()} 
            disabled={!code.trim()}
            activeOpacity={0.8}
          >
            <Text style={styles.applyBtnText}>{t(locale, 'apply')}</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.divider, { backgroundColor: theme.border }]} />

        {/* LIST SECTION */}
        <Text style={[styles.sectionTitle, { color: theme.textSecondary, marginBottom: 16 }]}>
          {locale === 'en' ? 'AVAILABLE OFFERS' : 'ДОСТУПНІ ПРОПОЗИЦІЇ'}
        </Text>

        <FlatList
          data={promos}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 20) }}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.ticketContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {/* Left Column (Accent & Discount) */}
              <View style={[styles.ticketLeft, { backgroundColor: item.color }]}>
                <Text style={styles.discountText}>{item.discount}</Text>
                <Text style={styles.discountLabel}>{locale === 'en' ? 'OFF' : 'ЗНИЖКА'}</Text>
                
                {/* Simulated ticket notches */}
                <View style={[styles.notch, styles.notchTop, { backgroundColor: theme.background }]} />
                <View style={[styles.notch, styles.notchBottom, { backgroundColor: theme.background }]} />
              </View>

              {/* Right Column (Details) */}
              <View style={styles.ticketRight}>
                <View style={{ flex: 1, paddingRight: 8 }}>
                  <Text style={[styles.promoCode, { color: theme.text }]} numberOfLines={1}>
                    {item.code}
                  </Text>
                  <Text style={[styles.promoDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {item.desc}
                  </Text>
                </View>

                {/* Actions */}
                <View style={styles.actionColumn}>
                  <TouchableOpacity 
                    style={[styles.actionBtn, { backgroundColor: theme.primary }]}
                    onPress={() => handleApplyPromo(item.code)}
                  >
                    <Text style={styles.actionBtnText}>{locale === 'en' ? 'Use' : 'Застосувати'}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={styles.copyBtn}
                    onPress={() => copyToClipboard(item.code)}
                  >
                    <Ionicons name="copy-outline" size={16} color={theme.textSecondary} style={{ marginRight: 2 }} />
                    <Text style={[styles.copyText, { color: theme.textSecondary }]}>{locale === 'en' ? 'Copy' : 'Копіювати'}</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 16, 
    paddingVertical: 12,
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold' },
  content: { padding: 16, flex: 1 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' },
  inputRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 24 },
  inputWrapper: { 
    flex: 1, 
    flexDirection: 'row', 
    alignItems: 'center', 
    height: 52, 
    borderRadius: 16, 
    borderWidth: 1, 
    paddingHorizontal: 16, 
    marginRight: 10,
  },
  inputIcon: { marginRight: 10 },
  input: { flex: 1, fontSize: 16, fontWeight: '600', paddingVertical: 0 },
  applyBtn: { 
    height: 52, 
    paddingHorizontal: 22, 
    borderRadius: 16, 
    justifyContent: 'center', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  applyBtnText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
  divider: { height: StyleSheet.hairlineWidth, marginBottom: 24 },
  
  // Coupon Ticket Styling
  ticketContainer: { 
    flexDirection: 'row', 
    height: 104, 
    marginBottom: 16, 
    borderRadius: 20, 
    overflow: 'hidden', 
    borderWidth: StyleSheet.hairlineWidth,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 2 }
    })
  },
  ticketLeft: { 
    width: 108, 
    justifyContent: 'center', 
    alignItems: 'center', 
    position: 'relative',
    paddingHorizontal: 8,
  },
  discountText: { color: 'white', fontSize: 24, fontWeight: '900', textAlign: 'center' },
  discountLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 10, fontWeight: '800', marginTop: 2, letterSpacing: 0.5 },
  
  notch: { 
    position: 'absolute', 
    right: -8, 
    width: 16, 
    height: 16, 
    borderRadius: 8, 
    zIndex: 10,
  },
  notchTop: { top: -8 },
  notchBottom: { bottom: -8 },
  
  ticketRight: { 
    flex: 1, 
    padding: 16, 
    flexDirection: 'row', 
    alignItems: 'center',
  },
  promoCode: { fontSize: 18, fontWeight: '900', marginBottom: 4, fontFamily: Platform.OS === 'ios' ? 'HelveticaNeue-Bold' : 'sans-serif-condensed' },
  promoDesc: { fontSize: 12, lineHeight: 16 },
  
  actionColumn: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginLeft: 8,
  },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: 'white',
    fontSize: 13,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  copyText: {
    fontSize: 11,
    fontWeight: '600',
  }
});