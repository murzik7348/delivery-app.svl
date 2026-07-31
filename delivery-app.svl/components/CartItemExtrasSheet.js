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

  // Local state: { [groupId]: { [modId]: mod } }
  const [selectedModifiers, setSelectedModifiers] = useState({});

  useEffect(() => {
    if (visible && item && catalogProduct?.modifierGroups) {
      const initial = {};
      catalogProduct.modifierGroups.forEach(group => {
          initial[group.id] = {};
          group.modifiers?.forEach(mod => {
              const isInCart = item.modifiers?.some(m => m.id === mod.id);
              if (isInCart) {
                  initial[group.id][mod.id] = mod;
              }
          });
      });
      setSelectedModifiers(initial);

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

  const getModifiersList = () => {
    const list = [];
    Object.values(selectedModifiers).forEach(groupMods => {
        list.push(...Object.values(groupMods));
    });
    return list;
  };

  const handleConfirm = () => {
    // Validate required modifiers selection
    const missing = [];
    const reqGroups = catalogProduct?.modifierGroups?.filter(g => g.isRequired || g.minSelection > 0) ?? [];
    reqGroups.forEach(g => {
        const selectedCount = Object.keys(selectedModifiers[g.id] || {}).length;
        const requiredMin = g.minSelection || (g.isRequired ? 1 : 0);
        if (selectedCount < requiredMin) {
            missing.push(g.name);
        }
    });

    if (missing.length > 0) {
        let AlertModule;
        try { AlertModule = require('react-native').Alert; } catch (e) { AlertModule = { alert: () => {} }; }
        AlertModule.alert(
            'Оберіть обов\'язкові параметри',
            `Будь ласка, виберіть: ${missing.join(', ')}`
        );
        return;
    }

    const newModifiers = getModifiersList().map(mod => ({
        ...mod,
        qty: 1
    }));

    dispatch(updateCartItemModifiers({
      cartKey: item.cartKey,
      modifiers: newModifiers,
    }));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => null);
    handleDismiss();
  };

  // Compute extras total
  const extrasTotal = getModifiersList().reduce((sum, mod) => sum + safeNum(mod.price), 0);

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
          {catalogProduct?.modifierGroups?.map((group) => {
              const selectedCount = Object.keys(selectedModifiers[group.id] || {}).length;
              return (
                  <View key={group.id} style={styles.groupContainer}>
                      <Text style={[styles.groupName, { color: theme.text }]}>
                          {group.name} {group.isRequired && <Text style={{ color: theme.primary }}>*</Text>}
                      </Text>
                      <View style={styles.optionsRow}>
                          {group.modifiers?.map((mod) => {
                              const isSelected = !!(selectedModifiers[group.id] && selectedModifiers[group.id][mod.id]);
                              return (
                                  <TouchableOpacity
                                      key={mod.id}
                                      style={[
                                          styles.optionChip,
                                          { 
                                              backgroundColor: isSelected ? theme.primary : theme.input,
                                              borderColor: isSelected ? theme.primary : 'rgba(0,0,0,0.05)'
                                          }
                                      ]}
                                      onPress={() => {
                                          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                          setSelectedModifiers(prev => {
                                              const currentGroupMods = { ...(prev[group.id] || {}) };
                                              const currentlySelected = !!currentGroupMods[mod.id];

                                              if (group.selectionType === 1) {
                                                  if (currentlySelected) {
                                                      if (group.isRequired && Object.keys(currentGroupMods).length === 1) {
                                                          return prev;
                                                      }
                                                      delete currentGroupMods[mod.id];
                                                  } else {
                                                      return { ...prev, [group.id]: { [mod.id]: mod } };
                                                  }
                                              } else {
                                                  if (currentlySelected) {
                                                      delete currentGroupMods[mod.id];
                                                  } else {
                                                      if (group.maxSelection !== null && selectedCount >= group.maxSelection) {
                                                          return prev;
                                                      }
                                                      currentGroupMods[mod.id] = mod;
                                                  }
                                              }
                                              return { ...prev, [group.id]: currentGroupMods };
                                          });
                                      }}
                                  >
                                      <Text style={[styles.optionText, { color: isSelected ? 'white' : theme.text }]}>
                                          {mod.name} {mod.price > 0 ? `(+${mod.price} ₴)` : ''}
                                      </Text>
                                  </TouchableOpacity>
                              );
                          })}
                      </View>
                  </View>
              );
          })}

          {/* Empty state if no addons available */}
          {(!catalogProduct?.modifierGroups || catalogProduct.modifierGroups.length === 0) && (
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
  groupContainer: {
    marginBottom: 16,
  },
  groupName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  optionChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
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
