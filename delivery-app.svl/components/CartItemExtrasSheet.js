import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useDispatch } from 'react-redux';
import Colors from '../constants/Colors';
import { updateCartItemModifiers, formatPrice } from '../store/cartSlice';
import * as Haptics from 'expo-haptics';

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.78;

/** Parse any value safely */
const safeNum = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

export default function CartItemExtrasSheet({ visible, item, catalogProduct, onClose }) {
  const dispatch = useDispatch();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];

  const translateY = useRef(new Animated.Value(SCREEN_H)).current;
  const activeScale = useRef(new Animated.Value(1)).current;

  // Local state: { [addonId]: quantity }
  // Pre-fill from current item.modifiers
  const [addonQtys, setAddonQtys] = useState({});

  useEffect(() => {
    if (visible && item) {
      // Build initial qtys from item.modifiers
      const initial = {};
      (item.modifiers ?? []).forEach((m) => {
        initial[m.id] = m.qty ?? 1;
      });
      setAddonQtys(initial);

      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }).start();
    } else {
      translateY.setValue(SCREEN_H);
    }
  }, [visible, item]);

  const handleDismiss = () => {
    Animated.timing(translateY, {
      toValue: SCREEN_H,
      duration: 240,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 8 && gs.dy > 0,
      onPanResponderGrant: () => {
        translateY.stopAnimation();
        Animated.spring(activeScale, { toValue: 1.25, friction: 8, useNativeDriver: true }).start();
      },
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
        else translateY.setValue(gs.dy * 0.15);
      },
      onPanResponderRelease: (_, gs) => {
        Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
        if (gs.vy > 0.5 || gs.dy > SHEET_H * 0.3) {
          handleDismiss();
        } else {
          Animated.spring(translateY, {
            toValue: 0, friction: 8, tension: 40, useNativeDriver: true,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
        Animated.spring(translateY, {
          toValue: 0, friction: 8, tension: 40, useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleConfirm = () => {
    // Build modifiers array from current local state
    const allAddons = catalogProduct?.modifierGroups?.flatMap(g => g.modifiers ?? []) ?? [];
    const newModifiers = allAddons
      .filter(addon => (addonQtys[addon.id] ?? 0) > 0)
      .map(addon => ({
        id: addon.id,
        name: addon.name,
        price: safeNum(addon.price),
        qty: addonQtys[addon.id] ?? 1,
        image: addon.image ?? null,
        description: addon.description ?? '',
      }));

    dispatch(updateCartItemModifiers({
      cartKey: item.cartKey,
      modifiers: newModifiers,
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    handleDismiss();
  };

  const incrementAddon = (addonId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    setAddonQtys(prev => ({ ...prev, [addonId]: (prev[addonId] ?? 0) + 1 }));
  };

  const decrementAddon = (addonId) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => null);
    setAddonQtys(prev => {
      const current = prev[addonId] ?? 0;
      if (current <= 0) return prev;
      return { ...prev, [addonId]: current - 1 };
    });
  };

  // Compute extras total
  const allAddons = catalogProduct?.modifierGroups?.flatMap(g => g.modifiers ?? []) ?? [];
  const extrasTotal = allAddons.reduce((sum, addon) => {
    return sum + safeNum(addon.price) * (addonQtys[addon.id] ?? 0);
  }, 0);

  if (!visible || !item) return null;

  const productImage = item.image ?? catalogProduct?.image;
  const productName = item.name ?? catalogProduct?.name ?? '';
  const productPrice = safeNum(item.price);
  const productDesc = catalogProduct?.description ?? item.description ?? '';

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      {/* Backdrop */}
      <Animated.View
        style={[
          StyleSheet.absoluteFillObject,
          {
            backgroundColor: 'rgba(0,0,0,0.55)',
            opacity: translateY.interpolate({
              inputRange: [0, SCREEN_H * 0.5],
              outputRange: [1, 0],
              extrapolate: 'clamp',
            }),
          },
        ]}
      >
        <TouchableWithoutFeedback onPress={handleDismiss}>
          <View style={StyleSheet.absoluteFillObject} />
        </TouchableWithoutFeedback>
      </Animated.View>

      {/* Sheet */}
      <Animated.View
        style={[
          styles.sheet,
          {
            backgroundColor: theme.card,
            height: SHEET_H,
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag handle area */}
        <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
          <Animated.View
            style={[
              styles.pill,
              { transform: [{ scaleX: activeScale }, { scaleY: activeScale }] },
            ]}
          />
        </View>

        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeBtn, { backgroundColor: theme.input }]}
          onPress={handleDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={18} color={theme.text} />
        </TouchableOpacity>

        {/* Product photo */}
        {productImage ? (
          <Image
            source={{ uri: productImage }}
            style={styles.productImage}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.productImage, { backgroundColor: theme.input, justifyContent: 'center', alignItems: 'center' }]}>
            <Ionicons name="image-outline" size={48} color="gray" />
          </View>
        )}

        {/* Name + price row */}
        <View style={[styles.titleRow, { paddingHorizontal: 20 }]}>
          <Text style={[styles.productName, { color: theme.text }]} numberOfLines={2}>
            {productName}
          </Text>
          <Text style={[styles.productPrice, { color: theme.primary }]}>
            {formatPrice(productPrice)} ₴
          </Text>
        </View>

        {/* Description */}
        {productDesc ? (
          <Text style={[styles.desc, { color: theme.textSecondary ?? 'gray', paddingHorizontal: 20 }]} numberOfLines={3}>
            {productDesc}
          </Text>
        ) : null}

        {/* Divider */}
        {allAddons.length > 0 && (
          <View style={[styles.divider, { backgroundColor: theme.border ?? 'rgba(0,0,0,0.08)' }]} />
        )}

        {/* Addons list */}
        <ScrollView
          style={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.addonsList}
        >
          {catalogProduct?.modifierGroups?.map((group) => (
            <View key={group.id}>
              {group.modifiers?.map((addon) => {
                const qty = addonQtys[addon.id] ?? 0;
                const addonPrice = safeNum(addon.price);
                const lineTotal = addonPrice * qty;

                return (
                  <View key={addon.id}>
                    <View style={styles.addonRow}>
                      {/* Addon image */}
                      {addon.image ? (
                        <Image
                          source={{ uri: addon.image }}
                          style={[styles.addonImage, { backgroundColor: theme.input }]}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.addonImagePlaceholder, { backgroundColor: theme.input }]}>
                          <Ionicons name="fast-food-outline" size={20} color="gray" />
                        </View>
                      )}

                      {/* Addon info */}
                      <View style={styles.addonInfo}>
                        <Text style={[styles.addonName, { color: theme.text }]}>
                          {addon.name}
                        </Text>
                        {addon.description ? (
                          <Text style={[styles.addonDesc, { color: theme.textSecondary ?? 'gray' }]} numberOfLines={2}>
                            {addon.description}
                          </Text>
                        ) : null}
                        {addonPrice > 0 ? (
                          <Text style={[styles.addonPrice, { color: 'gray' }]}>
                            {formatPrice(addonPrice)} ₴ / шт
                          </Text>
                        ) : null}
                      </View>

                      {/* Stepper */}
                      <View style={styles.addonStepper}>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => decrementAddon(addon.id)}
                          style={[styles.stepperBtn, { backgroundColor: qty > 0 ? theme.primary : theme.input }]}
                        >
                          <Ionicons name="remove" size={16} color={qty > 0 ? 'white' : 'gray'} />
                        </TouchableOpacity>
                        <Text style={[styles.stepperQty, { color: theme.text }]}>{qty}</Text>
                        <TouchableOpacity
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                          onPress={() => incrementAddon(addon.id)}
                          style={[styles.stepperBtn, { backgroundColor: theme.primary }]}
                        >
                          <Ionicons name="add" size={16} color="white" />
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Загалом row for this addon if qty > 0 */}
                    {qty > 0 && addonPrice > 0 && (
                      <View style={styles.addonTotalRow}>
                        <Text style={[styles.addonTotalLabel, { color: theme.primary }]}>Загалом</Text>
                        <Text style={[styles.addonTotalValue, { color: theme.primary }]}>
                          {formatPrice(lineTotal)} ₴
                        </Text>
                      </View>
                    )}

                    <View style={[styles.addonDivider, { backgroundColor: theme.border ?? 'rgba(0,0,0,0.06)' }]} />
                  </View>
                );
              })}
            </View>
          ))}

          {/* Empty state if no addons available */}
          {allAddons.length === 0 && (
            <View style={styles.emptyAddons}>
              <Ionicons name="add-circle-outline" size={40} color="gray" />
              <Text style={{ color: 'gray', marginTop: 8, fontSize: 14 }}>
                Додаткові інгредієнти недоступні
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Confirm button */}
        <View style={[styles.footer, { paddingBottom: Platform.OS === 'ios' ? 34 : 20 }]}>
          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={handleConfirm}
          >
            <Text style={styles.confirmBtnText}>
              Зрозуміло{extrasTotal > 0 ? ` (+${formatPrice(extrasTotal)} ₴)` : ''}
            </Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 16, shadowOffset: { width: 0, height: -4 } },
      android: { elevation: 16 },
    }),
  },
  dragHandleArea: {
    width: '100%',
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  pill: {
    width: 44,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#C6C6CC',
  },
  closeBtn: {
    position: 'absolute',
    top: 12,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  productImage: {
    width: '100%',
    height: SCREEN_H * 0.26,
    marginTop: 36,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginTop: 16,
    marginBottom: 6,
  },
  productName: {
    fontSize: 22,
    fontWeight: '800',
    flex: 1,
    marginRight: 12,
    letterSpacing: -0.3,
  },
  productPrice: {
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  desc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 20,
    marginBottom: 0,
  },
  addonsList: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 20,
  },
  addonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  addonImage: {
    width: 56,
    height: 56,
    borderRadius: 12,
  },
  addonImagePlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addonInfo: {
    flex: 1,
  },
  addonName: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  addonDesc: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 2,
  },
  addonPrice: {
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  addonStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperQty: {
    fontSize: 16,
    fontWeight: '800',
    minWidth: 20,
    textAlign: 'center',
  },
  addonTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    marginTop: -4,
  },
  addonTotalLabel: {
    fontSize: 15,
    fontWeight: '700',
  },
  addonTotalValue: {
    fontSize: 15,
    fontWeight: '700',
  },
  addonDivider: {
    height: StyleSheet.hairlineWidth,
    marginBottom: 2,
  },
  emptyAddons: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.06)',
  },
  confirmBtn: {
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
      android: { elevation: 4 },
    }),
  },
  confirmBtnText: {
    color: 'white',
    fontSize: 17,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
