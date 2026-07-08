import { Ionicons } from '@expo/vector-icons';
import { useRef, useState, useEffect } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Platform,
    PanResponder,
    ScrollView,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { tryAddToCart, removeFromCart, decrementItem, removeItem, formatPrice, makeCartKey } from '../store/cartSlice';
import { toggleFavoriteProduct } from '../store/favoritesSlice';
import * as Haptics from 'expo-haptics';

const safeNum = (v) => {
    const n = Number(v);
    return isNaN(n) ? 0 : n;
};

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.65;

export default function ProductSheet({ product, onClose }) {
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const cartItems = useSelector((s) => s.cart.items);
    const favoriteProductIds = useSelector((s) => s.favorites.productIds ?? []);
    const locale = useSelector((s) => s.language?.locale ?? 'uk');

    const [addedFlash, setAddedFlash] = useState(false);
    const [heartScale] = useState(new Animated.Value(1));
    const btnScale = useRef(new Animated.Value(1)).current;

    const pricingType = product?.pricingType ?? 'piece';
    const weightStep = product?.weightStep ?? 100;
    const minWeight = product?.minWeight ?? weightStep;
    const avgWeight = product?.averageWeight ?? product?.weightGrams ?? 350;

    const [selectedModifiers, setSelectedModifiers] = useState({});

    // Pre-select first modifier of each group by default on mount/change
    useEffect(() => {
        if (product?.modifierGroups) {
            const initial = {};
            product.modifierGroups.forEach(group => {
                if (group.modifiers && group.modifiers.length > 0) {
                    initial[group.id] = group.modifiers[0];
                }
            });
            setSelectedModifiers(initial);
        } else {
            setSelectedModifiers({});
        }
    }, [product]);

    const getModifiersList = () => Object.values(selectedModifiers);

    const currentCartKey = product ? makeCartKey({
        ...product,
        modifiers: getModifiersList()
    }) : null;

    const qty = cartItems.find((i) => i.cartKey === currentCartKey)?.quantity ?? 0;
    const isFav = favoriteProductIds.includes(product?.product_id ?? product?.id);

    // Calculate dynamic price based on selection
    const selectedModsList = getModifiersList();
    const modsPrice = selectedModsList.reduce((sum, m) => sum + safeNum(m.price), 0);
    const baseProductPrice = safeNum(product?.price);
    const singleUnitPrice = baseProductPrice + modsPrice;

    // Price formatting
    let priceLabel = `${formatPrice(singleUnitPrice)} ₴`;
    let detailLabel = '';
    let isWeighted = false;

    if (pricingType === 'weight_step') {
        priceLabel = `${formatPrice(product?.price)} ₴ / ${weightStep}г`;
        if (qty > 0) {
            const currentWeight = qty * weightStep;
            detailLabel = `${currentWeight} г`;
        } else {
            detailLabel = `мін. ${minWeight} г`;
        }
    } else if (pricingType === 'piece_variable') {
        priceLabel = `${formatPrice(product?.price)} ₴ / 100г`;
        isWeighted = true;
        if (qty > 0) {
            const estWeight = qty * avgWeight;
            const estPrice = qty * (avgWeight / 100) * product?.price;
            detailLabel = `${qty} шт (≈ ${estWeight}г) ≈ ${formatPrice(estPrice)} ₴`;
        } else {
            const estPrice = (avgWeight / 100) * product?.price;
            detailLabel = `1 шт ≈ ${avgWeight}г (≈ ${formatPrice(estPrice)} ₴)`;
        }
    } else if (selectedModsList.length > 0) {
        if (qty > 0) {
            detailLabel = `${qty} шт — ${formatPrice(singleUnitPrice * qty)} ₴`;
        }
    }

    const flashAdd = () => {
        setAddedFlash(true);
        Animated.sequence([
            Animated.timing(btnScale, { toValue: 1.06, duration: 100, useNativeDriver: true }),
            Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setAddedFlash(false), 700);
    };

    const handleAdd = () => {
        // Validate required modifiers selection
        const reqGroups = product?.modifierGroups?.filter(g => g.required) ?? [];
        const missing = reqGroups.filter(g => !selectedModifiers[g.id]);
        if (missing.length > 0) {
            let AlertModule;
            try {
                AlertModule = require('react-native').Alert;
            } catch (e) {
                AlertModule = { alert: (t, m) => console.log(t, m) };
            }
            AlertModule.alert(
                locale === 'en' ? 'Select options' : 'Оберіть параметри',
                locale === 'en' 
                  ? `Please select: ${missing.map(g => g.name).join(', ')}`
                  : `Будь ласка, виберіть: ${missing.map(g => g.name).join(', ')}`
            );
            return;
        }

        const success = dispatch(tryAddToCart({ 
            ...product,
            modifiers: getModifiersList()
        }));
        if (success) {
            flashAdd();
        }
    };

    const handleRemove = () => {
        if (currentCartKey) {
            const itemInCart = cartItems.find(i => i.cartKey === currentCartKey);
            if (itemInCart) {
                const step = itemInCart.weightStep ?? 100;
                const minW = itemInCart.minWeight ?? step;
                const minQty = Math.max(1, Math.round(minW / step));
                if (itemInCart.quantity > minQty) {
                    dispatch(decrementItem(currentCartKey));
                } else {
                    dispatch(removeItem(currentCartKey));
                }
            }
        }
    };

    const handleHeart = () => {
        dispatch(toggleFavoriteProduct(product.product_id ?? product.id));
        Animated.sequence([
            Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
            Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
    };

    const translateY = useRef(new Animated.Value(SCREEN_H)).current;
    const activeScale = useRef(new Animated.Value(1)).current;

    const handleDismiss = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 240,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (evt) => {
                const { locationY } = evt.nativeEvent;
                return locationY < 80;
            },
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const { locationY } = evt.nativeEvent;
                return locationY < 80 && Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                translateY.stopAnimation();
                Animated.spring(activeScale, { toValue: 1.3, friction: 8, useNativeDriver: true }).start();
            },
            onPanResponderMove: (_, gestureState) => {
                const dy = gestureState.dy;
                if (dy > 0) {
                    translateY.setValue(dy);
                } else {
                    translateY.setValue(dy * 0.25);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                if (gestureState.vy > 0.5 || gestureState.dy > SHEET_H * 0.35) {
                    handleDismiss();
                } else {
                    Animated.spring(translateY, {
                        toValue: 0,
                        friction: 8,
                        tension: 40,
                        useNativeDriver: true,
                    }).start();
                }
            },
            onPanResponderTerminate: () => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                Animated.spring(translateY, {
                    toValue: 0,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true,
                }).start();
            }
        })
    ).current;

    useEffect(() => {
        if (product) {
            Animated.spring(translateY, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            translateY.setValue(SCREEN_H);
        }
    }, [product]);

    if (!product) return null;

    return (
        <Modal
            visible
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={handleDismiss}
        >
            <Animated.View 
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: 'rgba(0,0,0,0.55)',
                        opacity: translateY.interpolate({
                            inputRange: [0, SCREEN_H],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        })
                    }
                ]}
            >
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <View style={StyleSheet.absoluteFillObject} />
                </TouchableWithoutFeedback>
            </Animated.View>

            <Animated.View 
                {...panResponder.panHandlers}
                style={[
                    styles.sheet, 
                    { 
                        backgroundColor: theme.card, 
                        height: SHEET_H,
                        transform: [{ translateY }]
                    }
                ]}
            >
                {/* Хендл-зона */}
                <View style={styles.dragHandleArea}>
                    <Animated.View 
                        style={[
                            styles.pill,
                            {
                                transform: [
                                    { scaleX: activeScale },
                                    { scaleY: activeScale }
                                ]
                            }
                        ]} 
                    />
                </View>

                {/* Кнопка закрити */}
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.input }]} onPress={handleDismiss}>
                    <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>

                {/* Кнопка серця */}
                <TouchableOpacity
                    style={[styles.heartBtn, { backgroundColor: isFav ? `${theme.primary}22` : theme.input, borderColor: isFav ? `${theme.primary}33` : 'rgba(0,0,0,0.05)' }]}
                    onPress={handleHeart}
                >
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFav ? theme.primary : theme.text}
                        />
                    </Animated.View>
                </TouchableOpacity>

                {/* Фото */}
                <Image
                    source={{ uri: product.image }}
                    style={styles.image}
                    resizeMode="cover"
                />

                {/* Контент */}
                <View style={styles.content}>
                    <Text style={[styles.name, { color: theme.text }]}>{product.name}</Text>

                    <ScrollView 
                        showsVerticalScrollIndicator={false}
                        contentContainerStyle={{ paddingBottom: 24 }}
                        style={{ flex: 1 }}
                    >
                        {product.description ? (
                            <Text style={[styles.desc, { color: 'gray', marginBottom: 16 }]}>{product.description}</Text>
                        ) : null}

                        {isWeighted && (
                            <View style={[styles.warningBox, { backgroundColor: theme.input }]}>
                                <Ionicons name="information-circle-outline" size={16} color={theme.text} />
                                <Text style={[styles.warningText, { color: theme.textSecondary }]}>
                                    Точна вага та ціна будуть відомі після приготування
                                </Text>
                            </View>
                        )}

                        {/* Options / Weight variants */}
                        {product.modifierGroups?.map((group) => (
                            <View key={group.id} style={styles.groupContainer}>
                                <Text style={[styles.groupName, { color: theme.text }]}>
                                    {group.name} {group.required && <Text style={{ color: theme.primary }}>*</Text>}
                                </Text>
                                <View style={styles.optionsRow}>
                                    {group.modifiers?.map((mod) => {
                                        const isSelected = selectedModifiers[group.id]?.id === mod.id;
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
                                                    setSelectedModifiers(prev => ({
                                                        ...prev,
                                                        [group.id]: mod
                                                    }));
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
                        ))}
                    </ScrollView>

                    {detailLabel ? (
                        <Text style={[styles.detailLabel, { color: theme.primary }]}>{detailLabel}</Text>
                    ) : null}

                    {/* Ціна + Controls */}
                    <View style={styles.footer}>
                        <Text style={[styles.price, { color: theme.primary, fontSize: pricingType !== 'piece' ? 18 : 26 }]}>{priceLabel}</Text>

                        {qty === 0 ? (
                            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: addedFlash ? '#2ecc71' : theme.primary, shadowColor: theme.primary }]}
                                    onPress={handleAdd}
                                    activeOpacity={0.85}
                                >
                                    <Ionicons name={addedFlash ? 'checkmark' : 'cart'} size={18} color="white" style={{ marginRight: 8 }} />
                                    <Text style={styles.addBtnText}>
                                        {addedFlash ? 'Додано!' : 'В кошик'}
                                    </Text>
                                </TouchableOpacity>
                            </Animated.View>
                        ) : (
                            <View style={styles.counter}>
                                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.input }]} onPress={handleRemove}>
                                    <Ionicons name="remove" size={18} color={theme.text} />
                                </TouchableOpacity>
                                <Text style={[styles.counterQty, { color: theme.text }]}>
                                    {pricingType === 'weight_step' ? `${qty * weightStep}г` : qty}
                                </Text>
                                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: theme.primary }]} onPress={handleAdd}>
                                    <Ionicons name="add" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </Animated.View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    sheet: {
        position: 'absolute',
        bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: -4 } },
            android: { elevation: 12 }
        })
    },
    pill: {
        width: 48, height: 5,
        borderRadius: 2.5,
        backgroundColor: '#ccc',
    },
    dragHandleArea: {
        width: '100%',
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        marginTop: 6,
    },
    closeBtn: {
        position: 'absolute',
        top: 16, right: 16,
        width: 34, height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    heartBtn: {
        position: 'absolute',
        top: 16, right: 58,
        width: 34, height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    image: {
        width: '100%',
        height: SCREEN_H * 0.28,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: -0.3,
        marginBottom: 10,
    },
    desc: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 16,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 'auto',
    },
    price: {
        fontSize: 26,
        fontWeight: '900',
        color: '#000000',
        letterSpacing: -0.5,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 18,
        ...Platform.select({
            ios: { shadowColor: '#000000', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 6 }
        })
    },
    addBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 16,
    },
    counter: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    counterBtn: {
        width: 44, height: 44,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    counterQty: {
        fontSize: 16,
        fontWeight: '800',
        minWidth: 44,
        textAlign: 'center',
    },
    warningBox: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 10,
        borderRadius: 12,
        marginBottom: 12,
    },
    warningText: {
        fontSize: 12,
        flex: 1,
    },
    detailLabel: {
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 12,
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
});
