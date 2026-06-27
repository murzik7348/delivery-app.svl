import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated,
  PanResponder, TouchableOpacity, TextInput, LayoutAnimation, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatPrice } from '../store/cartSlice';
import { GUIDELINE_BASE_DIAGONAL } from '../utils/scaling';
import { useColorScheme } from '../hooks/use-color-scheme';
import Colors from '../constants/Colors';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const SCREEN_DIAGONAL = Math.sqrt(SCREEN_WIDTH * SCREEN_WIDTH + SCREEN_HEIGHT * SCREEN_HEIGHT);
const getScaled = (val) => Math.round(val * (SCREEN_DIAGONAL / GUIDELINE_BASE_DIAGONAL));

const CLOSED_HEIGHT = getScaled(120);
const OPEN_HEIGHT = SCREEN_HEIGHT * 0.76;

export default function CartBottomSheet({
  totalAmount, subtotal, deliveryFee, discountAmount, deliveryType,
  appliedPromo, userAddress, paymentInfo, orderNote,
  onOrder, onOpenPromo, onOpenAddress, onOpenPayment, onNoteChange
}) {
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const insets = useSafeAreaInsets();
  const maxOffset = OPEN_HEIGHT - CLOSED_HEIGHT;
  const panY = useRef(new Animated.Value(maxOffset)).current;
  const [isNoteVisible, setIsNoteVisible] = useState(false);

  // Стан масштабування хендла для мікро-анімації
  const activeScale = useRef(new Animated.Value(1)).current;

  // Час та координати для розпізнавання тапу
  const touchStartTime = useRef(0);

  const toggleSheet = () => {
    const currentValue = panY._value;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    if (currentValue > maxOffset / 2) {
      Animated.spring(panY, { toValue: 0, friction: 7, tension: 45, useNativeDriver: true }).start();
    } else {
      Animated.spring(panY, { toValue: maxOffset, friction: 7, tension: 45, useNativeDriver: true }).start();
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: (evt) => {
        const { locationY } = evt.nativeEvent;
        return locationY < 48;
      },
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
        if (!isVertical) return false;

        const { locationY } = evt.nativeEvent;
        return locationY < 48 || Math.abs(gestureState.dy) > 5;
      },
      onPanResponderGrant: () => {
        panY.stopAnimation();
        touchStartTime.current = Date.now();
        panY.extractOffset();
        Animated.spring(activeScale, { toValue: 1.35, friction: 8, tension: 60, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gestureState) => {
        panY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();

        const duration = Date.now() - touchStartTime.current;
        const distance = Math.abs(gestureState.dy);

        if (duration < 250 && distance < 7) {
          toggleSheet();
        } else {
          if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.moveY < SCREEN_HEIGHT - 200)) {
            Animated.spring(panY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }).start();
          } else {
            Animated.spring(panY, { toValue: maxOffset, friction: 6, tension: 50, useNativeDriver: true }).start();
          }
        }
      },
      onPanResponderTerminate: () => {
        panY.flattenOffset();
        Animated.spring(activeScale, { toValue: 1, friction: 8, tension: 60, useNativeDriver: true }).start();
      }
    })
  ).current;

  const safeTotal = parseFloat(totalAmount) || 0;
  const safeSubtotal = parseFloat(subtotal) || 0;
  const safeDelivery = parseFloat(deliveryFee) || 0;
  const safeDiscount = parseFloat(discountAmount) || 0;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        styles.container,
        {
          height: OPEN_HEIGHT,
          bottom: Platform.OS === 'android' ? Math.max(insets.bottom, 48) : 0,
          transform: [{
            translateY: panY.interpolate({
              inputRange: [-200, 0, maxOffset, maxOffset + 200],
              outputRange: [-50, 0, maxOffset, maxOffset + 50],
              extrapolate: 'clamp',
            }),
          }],
        },
      ]}
    >
      {/* Преміальна та надчутлива зона перетягування */}
      <View style={styles.dragHandleArea}>
        <Animated.View
          style={[
            styles.dragIndicator,
            {
              transform: [
                { scaleX: activeScale },
                { scaleY: activeScale }
              ]
            }
          ]}
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>

        <View style={styles.headerRow}>
          <Text style={styles.totalLabel}>До сплати:</Text>
          <Text style={styles.totalPrice}>{formatPrice(safeTotal)} ₴</Text>
        </View>

        <TouchableOpacity style={styles.orderButton} onPress={onOrder} activeOpacity={0.8}>
          <Text style={styles.orderButtonText}>Оформити замовлення</Text>
        </TouchableOpacity>

        <View style={styles.detailsContainer}>
          <View style={styles.divider} />

          <View style={styles.detailRow}>
            <Text style={styles.detailText}>Товари</Text>
            <Text style={styles.detailPrice}>{formatPrice(safeSubtotal)} ₴</Text>
          </View>

          {deliveryType === 'delivery' && (
            <View style={styles.detailRow}>
              <Text style={styles.detailText}>Доставка</Text>
              <Text style={styles.detailPrice}>{safeDelivery === 0 ? 'Безкоштовно' : `${formatPrice(safeDelivery)} ₴`}</Text>
            </View>
          )}

          {safeDiscount > 0 && (
            <View style={styles.detailRow}>
              <Text style={{ color: theme.primary, fontSize: 16 }}>Знижка</Text>
              <Text style={{ color: theme.primary, fontSize: 16 }}>- {formatPrice(safeDiscount)} ₴</Text>
            </View>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={onOpenPromo} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name="ticket-outline" size={24} color={theme.primary} />
              <Text style={styles.menuText}>{appliedPromo ? appliedPromo.code : 'Промокод'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </TouchableOpacity>

          {deliveryType === 'delivery' && (
            <TouchableOpacity style={styles.menuItem} onPress={onOpenAddress} activeOpacity={0.7}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                <Ionicons name="location-outline" size={24} color="white" />
                <Text style={styles.menuText} numberOfLines={1}>{userAddress}</Text>
              </View>
              <Text style={{ color: theme.primary, fontSize: 12 }}>Змінити</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.menuItem} onPress={onOpenPayment} activeOpacity={0.7}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Ionicons name={paymentInfo?.icon || 'logo-apple'} size={24} color="white" />
              <Text style={styles.menuText}>{paymentInfo?.name || 'Оплата'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="gray" />
          </TouchableOpacity>

          <View style={{ marginTop: getScaled(15), paddingBottom: insets.bottom + getScaled(20) }}>
            {!isNoteVisible && !orderNote ? (
              <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsNoteVisible(true); }}>
                <Text style={{ color: '#d946ef', fontWeight: 'bold' }}>+ Коментар до замовлення</Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.noteContainer}>
                <TextInput
                  style={styles.noteInput}
                  placeholder="Код домофону, прибори..."
                  placeholderTextColor="gray"
                  value={orderNote}
                  onChangeText={onNoteChange}
                  multiline
                />
              </View>
            )}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -10 }, shadowOpacity: 0.3, shadowRadius: 20 },
      android: { elevation: 20 }
    }),
    zIndex: 999,
  },
  dragHandleArea: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent'
  },
  dragIndicator: {
    width: 48,
    height: 5,
    backgroundColor: '#555',
    borderRadius: 2.5
  },
  content: { paddingHorizontal: 20, flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  totalPrice: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  orderButton: { backgroundColor: '#d946ef', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  orderButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  detailsContainer: { marginTop: 10 },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#333', marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailText: { color: 'gray', fontSize: 16 },
  detailPrice: { color: 'white', fontSize: 16 },
  menuItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#2c2c2e', padding: 15, borderRadius: 12, marginTop: 10,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  menuText: { color: 'white', fontSize: 16, fontWeight: '500' },
  noteContainer: {
    backgroundColor: '#2c2c2e', borderRadius: getScaled(12), padding: getScaled(10),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.05)',
  },
  noteInput: { color: 'white', fontSize: getScaled(14), maxHeight: getScaled(60), paddingVertical: 0, textAlignVertical: 'top' },
});