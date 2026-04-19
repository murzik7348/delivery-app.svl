import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
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
    useColorScheme,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { addToCart, removeFromCart } from '../store/cartSlice';
import { toggleFavoriteProduct } from '../store/favoritesSlice';

const { height: SCREEN_H } = Dimensions.get('window');
const SHEET_H = SCREEN_H * 0.65;

export default function ProductSheet({ product, onClose }) {
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];

    const cartItems = useSelector((s) => s.cart.items);
    const favoriteProductIds = useSelector((s) => s.favorites.productIds ?? []);
    const qty = cartItems.find(
        (i) => (i.product_id ?? i.id) === (product?.product_id ?? product?.id)
    )?.quantity ?? 0;

    const isFav = favoriteProductIds.includes(product?.product_id ?? product?.id);

    const [addedFlash, setAddedFlash] = useState(false);
    const [heartScale] = useState(new Animated.Value(1));
    const btnScale = useRef(new Animated.Value(1)).current;

    const flashAdd = () => {
        setAddedFlash(true);
        Animated.sequence([
            Animated.timing(btnScale, { toValue: 1.06, duration: 100, useNativeDriver: true }),
            Animated.timing(btnScale, { toValue: 1, duration: 100, useNativeDriver: true }),
        ]).start();
        setTimeout(() => setAddedFlash(false), 700);
    };

    const handleAdd = () => {
        dispatch(addToCart({ ...product }));
        flashAdd();
    };

    const handleRemove = () => {
        dispatch(removeFromCart(product.product_id ?? product.id));
    };

    const handleHeart = () => {
        dispatch(toggleFavoriteProduct(product.product_id ?? product.id));
        Animated.sequence([
            Animated.timing(heartScale, { toValue: 1.4, duration: 120, useNativeDriver: true }),
            Animated.timing(heartScale, { toValue: 1, duration: 120, useNativeDriver: true }),
        ]).start();
    };

    if (!product) return null;

    return (
        <Modal
            visible
            transparent
            animationType="slide"
            statusBarTranslucent
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <View style={[styles.sheet, { backgroundColor: theme.card, height: SHEET_H }]}>
                {/* Drag pill */}
                <View style={styles.pill} />

                {/* Кнопка закрити */}
                <TouchableOpacity style={[styles.closeBtn, { backgroundColor: theme.input }]} onPress={onClose}>
                    <Ionicons name="close" size={18} color={theme.text} />
                </TouchableOpacity>

                {/* Кнопка серця */}
                <TouchableOpacity
                    style={[styles.heartBtn, { backgroundColor: isFav ? '#e334e322' : theme.input }]}
                    onPress={handleHeart}
                >
                    <Animated.View style={{ transform: [{ scale: heartScale }] }}>
                        <Ionicons
                            name={isFav ? 'heart' : 'heart-outline'}
                            size={20}
                            color={isFav ? '#e334e3' : theme.text}
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

                    {product.description ? (
                        <Text style={[styles.desc, { color: 'gray' }]}>{product.description}</Text>
                    ) : null}

                    {/* Ціна + Controls */}
                    <View style={styles.footer}>
                        <Text style={styles.price}>{product.price} ₴</Text>

                        {qty === 0 ? (
                            <Animated.View style={{ transform: [{ scale: btnScale }] }}>
                                <TouchableOpacity
                                    style={[styles.addBtn, { backgroundColor: addedFlash ? '#2ecc71' : '#e334e3' }]}
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
                                <Text style={[styles.counterQty, { color: theme.text }]}>{qty}</Text>
                                <TouchableOpacity style={[styles.counterBtn, { backgroundColor: '#e334e3' }]} onPress={handleAdd}>
                                    <Ionicons name="add" size={18} color="white" />
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </View>
            </View>
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
    },
    pill: {
        width: 44, height: 4,
        borderRadius: 2,
        backgroundColor: '#ccc',
        alignSelf: 'center',
        marginTop: 10,
        marginBottom: 6,
    },
    closeBtn: {
        position: 'absolute',
        top: 16, right: 16,
        width: 34, height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    heartBtn: {
        position: 'absolute',
        top: 16, right: 58,
        width: 34, height: 34,
        borderRadius: 17,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
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
        color: '#e334e3',
        letterSpacing: -0.5,
    },
    addBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 18,
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
    },
    counterQty: {
        fontSize: 20,
        fontWeight: '800',
        minWidth: 28,
        textAlign: 'center',
    },
});
