import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';
import { hideDynamicIsland } from '../store/uiSlice';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width } = Dimensions.get('window');

// Цей компонент показуватиметься всередині додатка зверху як "острівець"
export default function DynamicIsland() {
    const dispatch = useDispatch();
    const insets = useSafeAreaInsets();
    const { visible, title, message, icon, type } = useSelector((state) => state.ui.dynamicIsland);

    // Анімація висоти, ширини та Y
    const animValue = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            // Анімація появи (пружинна)
            Animated.spring(animValue, {
                toValue: 1,
                friction: 6,
                tension: 40,
                useNativeDriver: false, // height/width не підтримують native driver
            }).start();

            // Автоматично ховаємо через 3 секунди
            const timer = setTimeout(() => {
                closeIsland();
            }, 3000);

            return () => clearTimeout(timer);
        } else {
            // Анімація зникнення
            Animated.timing(animValue, {
                toValue: 0,
                duration: 300,
                useNativeDriver: false,
            }).start();
        }
    }, [visible]);

    const closeIsland = () => {
        Animated.timing(animValue, {
            toValue: 0,
            duration: 300,
            useNativeDriver: false,
        }).start(() => {
            dispatch(hideDynamicIsland());
        });
    };

    if (!visible && animValue._value === 0) return null;

    // Інтерпольовані значення
    const islandWidth = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [120, width * 0.9], // від маленької пігулки до широкої
    });

    const islandHeight = animValue.interpolate({
        inputRange: [0, 1],
        outputRange: [35, 75], // від висоти камери до панелі
    });

    const contentOpacity = animValue.interpolate({
        inputRange: [0, 0.8, 1],
        outputRange: [0, 0, 1],
    });

    // Колір іконки залежно від типу
    let iconColor = '#e334e3'; // default primary
    if (type === 'success') iconColor = '#4cd964';
    if (type === 'error') iconColor = '#ff3b30';
    if (type === 'info') iconColor = '#5ac8fa';

    const topOffset = Platform.OS === 'ios' ? insets.top || 45 : 15;

    return (
        <View style={[styles.wrapper, { top: topOffset }]} pointerEvents="box-none">
            <Animated.View
                style={[
                    styles.container,
                    {
                        width: islandWidth,
                        height: islandHeight,
                    },
                ]}
            >
                <Animated.View style={[styles.content, { opacity: contentOpacity }]}>
                    <View style={styles.iconContainer}>
                        <Ionicons name={icon} size={28} color={iconColor} />
                    </View>
                    <View style={styles.textContainer}>
                        {!!title && <Text style={styles.title}>{title}</Text>}
                        {!!message && <Text style={styles.message} numberOfLines={1}>{message}</Text>}
                    </View>
                </Animated.View>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    wrapper: {
        position: 'absolute',
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 9999, // Завжди поверх всього
        elevation: 9999,
    },
    container: {
        backgroundColor: '#000000', // Liquid glass look
        borderRadius: 40,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        justifyContent: 'center',
        overflow: 'hidden',
    },
    content: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        width: '100%',
    },
    iconContainer: {
        marginRight: 15,
    },
    textContainer: {
        flex: 1,
        justifyContent: 'center',
    },
    title: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: 'bold',
    },
    message: {
        color: '#a0a0a0',
        fontSize: 13,
        marginTop: 2,
    },
});
