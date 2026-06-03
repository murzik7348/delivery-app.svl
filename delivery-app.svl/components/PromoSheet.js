import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState, useEffect } from 'react';
import {
    Animated,
    Clipboard,
    Dimensions,
    Image,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    Platform,
    PanResponder,
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { tryAddToCart, applyDiscount, removeFromCart, updateQuantity } from '../store/cartSlice';

const { height: SCREEN_H } = Dimensions.get('window');

export default function PromoSheet({ promo, onClose }) {
    const router = useRouter();
    const dispatch = useDispatch();
    const scheme = useColorScheme();
    const theme = Colors[scheme ?? 'light'];
    const isDark = scheme === 'dark';
    const [copied, setCopied] = useState(false);
    const [cartAnim] = useState(new Animated.Value(1));
    const scaleAnim = useRef(new Animated.Value(1)).current;

    const cartItems = useSelector(s => s.cart.items ?? []);
    const product = promo?.product;
    const cartQty = product
        ? (cartItems.find(i => (i.product_id ?? i.id) === product.product_id)?.quantity ?? 0)
        : 0;

    const translateY = useRef(new Animated.Value(SCREEN_H)).current;
    const activeScale = useRef(new Animated.Value(1)).current;
    const scrollOffset = useRef(0);

    const handleDismiss = () => {
        Animated.timing(translateY, {
            toValue: SCREEN_H,
            duration: 220,
            useNativeDriver: true,
        }).start(() => {
            onClose();
        });
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: (evt, gestureState) => {
                const { locationY } = evt.nativeEvent;
                return locationY < 200 || scrollOffset.current <= 0;
            },
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                const isVertical = Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.5;
                if (!isVertical) return false;

                const { locationY } = evt.nativeEvent;
                const isTouchInHeader = locationY < 200;
                const isPullingDown = gestureState.dy > 2;
                const isAtTop = scrollOffset.current <= 0;

                return isTouchInHeader || (isPullingDown && isAtTop);
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
                    translateY.setValue(dy * 0.2);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                Animated.spring(activeScale, { toValue: 1, friction: 8, useNativeDriver: true }).start();
                if (gestureState.vy > 0.5 || gestureState.dy > SCREEN_H * 0.3) {
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
        Animated.spring(translateY, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    }, []);

    const handleCopyCode = () => {
        Clipboard.setString(promo.promoCode);
        setCopied(true);
        Animated.sequence([
            Animated.timing(scaleAnim, { toValue: 0.92, duration: 80, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1.05, duration: 120, useNativeDriver: true }),
            Animated.timing(scaleAnim, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setCopied(false), 2500);
    };

    const handleGoToStore = () => {
        handleDismiss();
        router.push(promo.storeId ? `/restaurant/${promo.storeId}` : '/search');
    };

    const handleAdd = () => {
        const success = dispatch(tryAddToCart(product));
        if (success) {
            // Якщо акція має 'buy2half' — автоматично активуємо знижку
            if (promo.discountType === 'buy2half') {
                dispatch(applyDiscount({
                    type: 'buy2half',
                    productId: promo.discountProductId,
                    percent: promo.discountPercent,
                }));
            }
            Animated.sequence([
                Animated.timing(cartAnim, { toValue: 0.85, duration: 80, useNativeDriver: true }),
                Animated.timing(cartAnim, { toValue: 1.1, duration: 100, useNativeDriver: true }),
                Animated.timing(cartAnim, { toValue: 1, duration: 80, useNativeDriver: true }),
            ]).start();
        }
    };

    const handleRemove = () => {
        if (cartQty <= 1) {
            dispatch(removeFromCart(product.product_id));
        } else {
            dispatch(updateQuantity({ id: product.product_id, quantity: cartQty - 1 }));
        }
    };

    if (!promo) return null;

    return (
        <Modal visible transparent animationType="none" statusBarTranslucent onRequestClose={handleDismiss}>
            <Animated.View 
                style={[
                    StyleSheet.absoluteFillObject,
                    {
                        backgroundColor: 'rgba(0,0,0,0.6)',
                        opacity: translateY.interpolate({
                            inputRange: [0, SCREEN_H],
                            outputRange: [1, 0],
                            extrapolate: 'clamp',
                        })
                    }
                ]}
            >
                <TouchableWithoutFeedback onPress={handleDismiss}>
                    <View style={StyleSheet.absoluteFill} />
                </TouchableWithoutFeedback>
            </Animated.View>

            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <Animated.View
                    {...panResponder.panHandlers}
                    style={[
                        s.sheet,
                        {
                            backgroundColor: isDark ? '#141414' : '#f8f8f8',
                            transform: [{ translateY }],
                        }
                    ]}
                >
                    <View style={s.dragHandleArea}>
                        <Animated.View 
                            style={[
                                s.pill,
                                {
                                    transform: [
                                        { scaleX: activeScale },
                                        { scaleY: activeScale }
                                    ]
                                }
                            ]} 
                        />
                    </View>

                    {/* Hero */}
                    <View style={s.heroWrap}>
                        <Image source={{ uri: promo.image }} style={s.hero} />
                        <View style={s.heroOverlay} />
                        <View style={[s.tag, { backgroundColor: promo.tagColor ?? theme.primary }]}>
                            <Text style={s.tagText}>{promo.tag}</Text>
                        </View>
                        <TouchableOpacity style={s.closeBtn} onPress={handleDismiss}>
                            <Ionicons name="close" size={18} color="white" />
                        </TouchableOpacity>
                        <View style={s.heroTitle}>
                            <Text style={s.heroTitleText}>{promo.title}</Text>
                        </View>
                    </View>

                    <ScrollView 
                        contentContainerStyle={s.body} 
                        showsVerticalScrollIndicator={false}
                        onScroll={(e) => {
                            scrollOffset.current = e.nativeEvent.contentOffset.y;
                        }}
                        scrollEventThrottle={16}
                    >
                        <Text style={[s.desc, { color: theme.text }]}>{promo.description}</Text>

                        {/* ── Картка товару ── */}
                        {product && (
                            <View style={[s.productCard, { backgroundColor: theme.card }]}>
                                <Image source={{ uri: product.image }} style={s.productImg} />
                                <View style={s.productInfo}>
                                    <Text style={[s.productName, { color: theme.text }]}>{product.name}</Text>
                                    <Text style={[s.productDesc, { color: 'gray' }]} numberOfLines={1}>
                                        {product.description}
                                    </Text>
                                    <Text style={[s.productPrice, { color: promo.tagColor ?? theme.primary }]}>
                                        {product.price} грн
                                    </Text>
                                </View>
                                {/* Кнопки кошика */}
                                <Animated.View style={{ transform: [{ scale: cartAnim }] }}>
                                    {cartQty === 0 ? (
                                        <TouchableOpacity
                                            style={[s.addBtn, { backgroundColor: promo.tagColor ?? theme.primary }]}
                                            onPress={handleAdd}
                                            activeOpacity={0.8}
                                        >
                                            <Ionicons name="add" size={20} color="white" />
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={s.counter}>
                                            <TouchableOpacity
                                                style={[s.counterBtn, { backgroundColor: theme.input }]}
                                                onPress={handleRemove}
                                            >
                                                <Ionicons name="remove" size={16} color={theme.text} />
                                            </TouchableOpacity>
                                            <Text style={[s.counterQty, { color: theme.text }]}>{cartQty}</Text>
                                            <TouchableOpacity
                                                style={[s.counterBtn, { backgroundColor: promo.tagColor ?? theme.primary }]}
                                                onPress={handleAdd}
                                            >
                                                <Ionicons name="add" size={16} color="white" />
                                            </TouchableOpacity>
                                        </View>
                                    )}
                                </Animated.View>
                            </View>
                        )}

                        {/* ── Промокод ── */}
                        {promo.promoCode && (
                            <View style={s.codeSection}>
                                <Text style={[s.codeLbl, { color: 'gray' }]}>ПРОМОКОД</Text>
                                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                                    <TouchableOpacity
                                        style={[s.codeBox, {
                                            backgroundColor: isDark ? '#1e1e1e' : '#fff',
                                            borderColor: copied ? '#27ae60' : (promo.tagColor ?? theme.primary),
                                        }]}
                                        onPress={handleCopyCode}
                                        activeOpacity={0.8}
                                    >
                                        <Text style={[s.codeText, { color: promo.tagColor ?? theme.primary }]}>
                                            {promo.promoCode}
                                        </Text>
                                        <View style={[s.copyBtn, { backgroundColor: copied ? '#27ae60' : (promo.tagColor ?? theme.primary) }]}>
                                            <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={16} color="white" />
                                            <Text style={s.copyBtnText}>{copied ? 'Скопійовано!' : 'Копіювати'}</Text>
                                        </View>
                                    </TouchableOpacity>
                                </Animated.View>
                            </View>
                        )}

                        {/* ── Умови ── */}
                        {promo.terms && (
                            <View style={[s.termsBox, { backgroundColor: isDark ? '#1e1e1e' : '#f0f0f5' }]}>
                                <Ionicons name="information-circle-outline" size={16} color="gray" style={{ marginRight: 6 }} />
                                <Text style={[s.termsText, { color: 'gray' }]}>{promo.terms}</Text>
                            </View>
                        )}

                        {/* ── CTA ── */}
                        <TouchableOpacity
                            style={[s.ctaBtn, { backgroundColor: promo.tagColor ?? theme.primary }]}
                            onPress={handleGoToStore}
                        >
                            <Ionicons name="storefront-outline" size={18} color="white" style={{ marginRight: 8 }} />
                            <Text style={s.ctaBtnText}>
                                {promo.storeId ? `Відкрити ${promo.storeName ?? 'ресторан'}` : 'Всі заклади'}
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>
                </Animated.View>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    sheet: {
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        overflow: 'hidden',
        maxHeight: SCREEN_H * 0.9,
    },
    dragHandleArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        zIndex: 10,
    },
    pill: {
        width: 48,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },

    heroWrap: { position: 'relative', height: 200 },
    hero: { width: '100%', height: '100%', resizeMode: 'cover' },
    heroOverlay: {
        position: 'absolute', left: 0, right: 0, bottom: 0, height: 100,
        backgroundColor: 'rgba(0,0,0,0.55)',
    },
    heroTitle: { position: 'absolute', bottom: 14, left: 14, right: 60 },
    heroTitleText: {
        color: 'white', fontSize: 19, fontWeight: '800', lineHeight: 24,
        textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 8,
    },
    tag: {
        position: 'absolute', top: 14, left: 14,
        paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
    },
    tagText: { color: 'white', fontWeight: '900', fontSize: 13 },
    closeBtn: {
        position: 'absolute', top: 14, right: 14,
        width: 34, height: 34, borderRadius: 17,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center', alignItems: 'center',
    },

    body: { padding: 16, paddingBottom: 36 },
    desc: { fontSize: 14, lineHeight: 21, marginBottom: 16, fontWeight: '500' },

    // Product card
    productCard: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 16, padding: 12, marginBottom: 16, gap: 12,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
            android: { elevation: 2 },
        }),
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: 'rgba(0,0,0,0.08)',
    },
    productImg: { width: 72, height: 72, borderRadius: 12, backgroundColor: '#222' },
    productInfo: { flex: 1 },
    productName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
    productDesc: { fontSize: 12, marginBottom: 4 },
    productPrice: { fontSize: 15, fontWeight: '800' },
    addBtn: {
        width: 38, height: 38, borderRadius: 12,
        justifyContent: 'center', alignItems: 'center',
    },
    counter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    counterBtn: {
        width: 32, height: 32, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center',
    },
    counterQty: { fontWeight: '800', fontSize: 16, minWidth: 20, textAlign: 'center' },

    // Promo code
    codeSection: { marginBottom: 16 },
    codeLbl: { fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
    codeBox: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        borderWidth: StyleSheet.hairlineWidth, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14,
    },
    codeText: { fontSize: 19, fontWeight: '900', letterSpacing: 2 },
    copyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 11, paddingVertical: 7, borderRadius: 10,
    },
    copyBtnText: { color: 'white', fontWeight: '700', fontSize: 13 },

    // Terms
    termsBox: {
        flexDirection: 'row', padding: 12, borderRadius: 12,
        marginBottom: 16, alignItems: 'flex-start',
    },
    termsText: { flex: 1, fontSize: 12, lineHeight: 18 },

    // CTA
    ctaBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        height: 52, borderRadius: 16,
        ...Platform.select({
            ios: { shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 12, shadowOffset: { width: 0, height: 6 } },
            android: { elevation: 6 },
        }),
    },
    ctaBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
