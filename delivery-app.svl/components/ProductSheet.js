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
} from 'react-native';
import { useColorScheme } from '../hooks/use-color-scheme';
import { useDispatch, useSelector } from 'react-redux';
import Colors from '../constants/Colors';
import { addToCart, removeFromCart, decrementItem } from '../store/cartSlice';
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
        const prodId = product.product_id ?? product.id;
        const itemInCart = cartItems.find(i => (i.product_id ?? i.id) === prodId);
        if (itemInCart) {
            if (itemInCart.quantity > 1) {
                dispatch(decrementItem(itemInCart.cartKey));
            } else {
                dispatch(removeFromCart(prodId));
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
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
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
        borderColor: 'rgba(227, 52, 227, 0.2)',
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
        ...Platform.select({
            ios: { shadowColor: '#e334e3', shadowOpacity: 0.3, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
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
        fontSize: 20,
        fontWeight: '800',
        minWidth: 28,
        textAlign: 'center',
    },
});
