import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    Animated,
    Dimensions,
    TouchableOpacity,
    TextInput,
    Platform,
    KeyboardAvoidingView,
    FlatList,
    Keyboard,
    useColorScheme,
    Image,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch, useSelector } from 'react-redux';
import { toggleAiChat, addMessage, setTyping } from '../store/aiSlice';
import { AiService } from '../services/AiService';
import * as Haptics from 'expo-haptics';
import ProductSheet from './ProductSheet';
import Colors from '../constants/Colors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function AiChatSheet() {
    const dispatch = useDispatch();
    const colorScheme = useColorScheme();
    const isDark = colorScheme === 'dark';
    const theme = Colors[colorScheme ?? 'light'];

    const { isOpen, messages, isTyping } = useSelector(state => state.ai);

    // App context required by AiService to simulate intelligence
    const orders = useSelector(state => state.orders.orders);
    const cartItems = useSelector(state => state.cart.items);
    const cartTotal = useSelector(state => state.cart.totalAmount);
    const user = useSelector(state => state.auth.user);
    const products = useSelector(state => state.catalog.products);

    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const flatListRef = useRef(null);
    const [isMounted, setIsMounted] = useState(false);

    const [inputText, setInputText] = useState('');
    const [selectedProduct, setSelectedProduct] = useState(null);

    useEffect(() => {
        if (isOpen) {
            setIsMounted(true);
            Animated.spring(slideAnim, {
                toValue: 0,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start(() => {
                // Only unmount AFTER animation finishes — prevents touch blocking
                setIsMounted(false);
            });
            Keyboard.dismiss();
        }
    }, [isOpen]);

    const handleSend = async () => {
        if (!inputText.trim()) return;

        const userText = inputText.trim();
        setInputText('');
        Keyboard.dismiss();

        // 1. Dispatch user message to Redux
        dispatch(addMessage({ role: 'user', text: userText }));

        // 2. Set thinking state
        dispatch(setTyping(true));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

        // 3. Collect App Context to give to AI Engine
        const appContext = { orders, cartItems, cartTotal, user, catalogProducts: products };

        try {
            // 4. Send to isolated AI Service (Scalable to API later)
            const aiResponse = await AiService.processQuery(userText, appContext);

            // 5. Handle Specific Intents
            let finalReplyText = "";
            let actionPayload = null;

            if (aiResponse.intent === 'SEMANTIC_FOOD_SEARCH') {
                const recommendedIds = aiResponse.payload?.productIds || [];
                if (recommendedIds.length > 0) {
                    const matchedProducts = products.filter(p => recommendedIds.includes(p.product_id));
                    finalReplyText = `Я знайшов кілька ідеальних варіантів для тебе. Щось із цього додати в кошик?`;
                    actionPayload = matchedProducts; // Pass objects to UI renderer
                } else {
                    finalReplyText = "На жаль, за твоїм описом я не зміг підібрати нічого з нашого каталогу.";
                }
            } else if (aiResponse.intent === 'SMART_CART_UPSELL') {
                const upsellId = aiResponse.payload?.productId;
                const upsellReason = aiResponse.payload?.reason || "Спробуй цю страву, вона чудово підійде!";

                if (upsellId) {
                    const upsellProduct = products.find(p => p.product_id === upsellId);
                    if (upsellProduct) {
                        finalReplyText = upsellReason;
                        actionPayload = [upsellProduct];
                    } else {
                        finalReplyText = "Я б хотів порадити тобі щось цікаве, але не можу його знайти. 🧐";
                    }
                } else {
                    finalReplyText = upsellReason;
                }
            } else if (aiResponse.intent === 'ORDER_ASSISTANT' || aiResponse.intent === 'GENERAL_CHAT') {
                finalReplyText = aiResponse.payload?.message || "Вибачте, не зміг сформулювати відповідь.";
            } else if (aiResponse.intent === 'SMART_ADDRESS_PARSE') {
                finalReplyText = "Ось що я розпізнав (готуємо до інтеграції на сторінці чекауту):\n" + JSON.stringify(aiResponse.payload, null, 2);
            } else {
                // Fallback: Dump raw JSON for unrecognized intents for inspection
                finalReplyText = aiResponse.rawJson || "Немає відповіді.";
            }

            dispatch(addMessage({ role: 'assistant', text: finalReplyText, actionPayload }));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } catch (error) {
            dispatch(addMessage({ role: 'assistant', text: 'Вибачте, сталася помилка з\'єднання з AI. Спробуйте пізніше.' }));
        } finally {
            dispatch(setTyping(false));
        }
    };

    const renderMessage = ({ item }) => {
        const isUser = item.role === 'user';
        return (
            <View style={{ marginBottom: 16 }}>
                <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble, { backgroundColor: isUser ? '#e334e3' : (isDark ? '#2C2C2E' : '#E5E5EA') }]}>
                    {!isUser && <Ionicons name="sparkles" size={14} color={isDark ? '#e334e3' : '#FF2D55'} style={{ marginBottom: 4 }} />}
                    <Text style={[styles.messageText, { color: isUser ? 'white' : (isDark ? 'white' : 'black') }]}>
                        {item.text}
                    </Text>
                </View>

                {/* Render Native App Horizontal Cards OUTSIDE the text bubble */}
                {item.actionPayload && Array.isArray(item.actionPayload) && (
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{ marginTop: 8, paddingLeft: 16, paddingRight: 4, paddingBottom: 4 }}
                    >
                        {item.actionPayload.map((product) => (
                            <TouchableOpacity
                                key={product.product_id.toString()}
                                style={[styles.gridCard, { backgroundColor: theme.card }]}
                                activeOpacity={0.8}
                                onPress={() => setSelectedProduct(product)}
                            >
                                <Image source={{ uri: product.image }} style={styles.gridCardImage} />
                                <View style={styles.gridCardContent}>
                                    <Text style={[styles.gridCardTitle, { color: theme.text }]} numberOfLines={1}>
                                        {product.name}
                                    </Text>
                                    <Text style={[styles.gridCardPrice, { color: '#e334e3' }]}>{product.price} ₴</Text>
                                    <View style={styles.gridAddBtn}>
                                        <Ionicons name="add" size={20} color="white" />
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                )}
            </View>
        );
    };

    if (!isMounted) return null;

    return (
        <Modal transparent visible animationType="none">
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                style={styles.backdrop}
            >
                <TouchableOpacity style={styles.touchableBackground} activeOpacity={1} onPress={() => dispatch(toggleAiChat(false))} />

                <Animated.View style={[styles.sheet, { backgroundColor: isDark ? '#1C1C1E' : '#FFFFFF', transform: [{ translateY: slideAnim }] }]}>

                    <View style={styles.header}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="sparkles" size={20} color="#e334e3" />
                            <Text style={[styles.title, { color: isDark ? 'white' : 'black' }]}>AI Помічник</Text>
                        </View>
                        <TouchableOpacity onPress={() => dispatch(toggleAiChat(false))} style={styles.closeBtn}>
                            <Ionicons name="close-circle" size={28} color="gray" />
                        </TouchableOpacity>
                    </View>

                    <FlatList
                        ref={flatListRef}
                        data={messages}
                        keyExtractor={item => item.id}
                        renderItem={renderMessage}
                        contentContainerStyle={styles.chatContainer}
                        showsVerticalScrollIndicator={false}
                        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                        onLayout={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    />

                    {isTyping && (
                        <View style={styles.typingIndicator}>
                            <Text style={{ color: 'gray', fontStyle: 'italic' }}>AI думає...</Text>
                        </View>
                    )}

                    <View style={[styles.inputContainer, { borderTopColor: isDark ? '#333' : '#EEE' }]}>
                        <TextInput
                            style={[styles.input, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7', color: isDark ? 'white' : 'black' }]}
                            placeholder="Запитайте щось..."
                            placeholderTextColor="gray"
                            value={inputText}
                            onChangeText={setInputText}
                            onSubmitEditing={handleSend}
                            returnKeyType="send"
                        />
                        <TouchableOpacity
                            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? '#e334e3' : 'gray' }]}
                            onPress={handleSend}
                            disabled={!inputText.trim() || isTyping}
                        >
                            <Ionicons name="send" size={18} color="white" />
                        </TouchableOpacity>
                    </View>

                </Animated.View>
            </KeyboardAvoidingView>

            {selectedProduct && (
                <ProductSheet
                    product={selectedProduct}
                    onClose={() => setSelectedProduct(null)}
                />
            )}
        </Modal>
    );
}

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'flex-end',
    },
    touchableBackground: {
        flex: 1,
    },
    sheet: {
        height: SCREEN_HEIGHT * 0.75,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 10,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(150,150,150,0.2)',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    chatContainer: {
        padding: 16,
        paddingBottom: 20,
    },
    messageBubble: {
        maxWidth: '80%',
        padding: 12,
        borderRadius: 20,
        marginBottom: 12,
    },
    userBubble: {
        alignSelf: 'flex-end',
        borderBottomRightRadius: 4,
    },
    aiBubble: {
        alignSelf: 'flex-start',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 22,
    },
    typingIndicator: {
        paddingLeft: 20,
        paddingBottom: 10,
    },
    inputContainer: {
        flexDirection: 'row',
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 36 : 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    input: {
        flex: 1,
        height: 48,
        borderRadius: 24,
        paddingHorizontal: 20,
        fontSize: 16,
    },
    sendBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 10,
    },
    gridCard: {
        width: 140,
        height: 184, // Strict bounds to stop infinite vertical stretching
        marginRight: 12,
        borderRadius: 16,
        overflow: 'hidden',
        justifyContent: 'flex-start',
        // Match the elevation/shadow style of catalog.js
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    gridCardImage: {
        width: '100%',
        height: 120,
        backgroundColor: '#eee'
    },
    gridCardContent: {
        padding: 10,
    },
    gridCardTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    gridCardPrice: {
        color: '#e334e3',
        fontWeight: 'bold',
        fontSize: 16,
    },
    gridAddBtn: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#e334e3',
        padding: 8,
        borderTopLeftRadius: 10,
        borderBottomRightRadius: 16,
    }
});
