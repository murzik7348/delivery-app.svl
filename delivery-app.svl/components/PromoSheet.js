import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useRef, useState } from 'react';
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
    useColorScheme,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { addToCart, applyDiscount, removeFromCart, updateQuantity } from '../store/cartSlice';

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
        onClose();
        router.push(promo.storeId ? `/restaurant/${promo.storeId}` : '/(tabs)/search');
    };

    const handleAdd = () => {
        dispatch(addToCart(product));
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
        <Modal visible transparent animationType="slide" statusBarTranslucent onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={s.backdrop} />
            </TouchableWithoutFeedback>

            <View style={[s.sheet, { backgroundColor: isDark ? '#141414' : '#f8f8f8' }]}>
                {/* Hero */}
                <View style={s.heroWrap}>
                    <Image source={{ uri: promo.image }} style={s.hero} />
                    <View style={s.heroOverlay} />
                    <View style={[s.tag, { backgroundColor: promo.tagColor ?? '#e334e3' }]}>
                        <Text style={s.tagText}>{promo.tag}</Text>
                    </View>
                    <TouchableOpacity style={s.closeBtn} onPress={onClose}>
                        <Ionicons name="close" size={18} color="white" />
                    </TouchableOpacity>
                    <View style={s.heroTitle}>
                        <Text style={s.heroTitleText}>{promo.title}</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={s.body} showsVerticalScrollIndicator={false}>
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
                                <Text style={[s.productPrice, { color: promo.tagColor ?? '#e334e3' }]}>
                                    {product.price} грн
                                </Text>
                            </View>
                            {/* Кнопки кошика */}
                            <Animated.View style={{ transform: [{ scale: cartAnim }] }}>
                                {cartQty === 0 ? (
                                    <TouchableOpacity
                                        style={[s.addBtn, { backgroundColor: promo.tagColor ?? '#e334e3' }]}
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
                                            style={[s.counterBtn, { backgroundColor: promo.tagColor ?? '#e334e3' }]}
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
                                        borderColor: copied ? '#27ae60' : (promo.tagColor ?? '#e334e3'),
                                    }]}
                                    onPress={handleCopyCode}
                                    activeOpacity={0.8}
                                >
                                    <Text style={[s.codeText, { color: promo.tagColor ?? '#e334e3' }]}>
                                        {promo.promoCode}
                                    </Text>
                                    <View style={[s.copyBtn, { backgroundColor: copied ? '#27ae60' : (promo.tagColor ?? '#e334e3') }]}>
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
                        style={[s.ctaBtn, { backgroundColor: promo.tagColor ?? '#e334e3' }]}
                        onPress={handleGoToStore}
                    >
                        <Ionicons name="storefront-outline" size={18} color="white" style={{ marginRight: 8 }} />
                        <Text style={s.ctaBtnText}>
                            {promo.storeId ? `Відкрити ${promo.storeName ?? 'ресторан'}` : 'Всі заклади'}
                        </Text>
                    </TouchableOpacity>
                </ScrollView>
            </View>
        </Modal>
    );
}

const s = StyleSheet.create({
    backdrop: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
    },
    sheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        overflow: 'hidden',
        maxHeight: SCREEN_H * 0.9,
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
        shadowColor: '#000', shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
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
        borderWidth: 1.5, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14,
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
        shadowOpacity: 0.3, shadowRadius: 12, shadowOffset: { width: 0, height: 5 }, elevation: 7,
    },
    ctaBtnText: { color: 'white', fontWeight: '800', fontSize: 15 },
});
