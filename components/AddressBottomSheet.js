import React, { useRef, useState } from 'react';

import {

View,

Text,

StyleSheet,

Dimensions,

Animated,

PanResponder,

TouchableOpacity,

Platform

} from 'react-native';

import { Ionicons } from '@expo/vector-icons';

import { useRouter } from 'expo-router';



const SCREEN_HEIGHT = Dimensions.get('window').height;



// НАЛАШТУВАННЯ (Можеш підкрутити під себе)

const CLOSED_HEIGHT = 120; // Висота, коли шторка згорнута (видно тільки кнопку і ціну)

const OPEN_HEIGHT = SCREEN_HEIGHT * 0.7; // Висота, коли шторка відкрита (70% екрану)



export default function CartBottomSheet({ totalAmount, onOrder }) {

const router = useRouter();



// Початкове положення - згорнута (схована вниз, стирчить тільки хвостик)

// Ми рухаємо шторку через translateY.

// 0 = повністю відкрита.

// (OPEN_HEIGHT - CLOSED_HEIGHT) = повністю закрита.

const maxOffset = OPEN_HEIGHT - CLOSED_HEIGHT;

const panY = useRef(new Animated.Value(maxOffset)).current;


// Зберігаємо останнє положення, щоб анімація не дьоргалась

const lastGestureDy = useRef(0);



const panResponder = useRef(

PanResponder.create({

onStartShouldSetPanResponder: () => true,

onMoveShouldSetPanResponder: (_, gestureState) => {

// Реагуємо тільки якщо тягнуть вертикально більше ніж на 5 пікселів

return Math.abs(gestureState.dy) > 5;

},

onPanResponderGrant: () => {

// Запам'ятовуємо поточне значення анімації, коли торкнулись пальцем

panY.extractOffset();

},

onPanResponderMove: (_, gestureState) => {

// Рухаємо шторку за пальцем

panY.setValue(gestureState.dy);

},

onPanResponderRelease: (_, gestureState) => {

// Коли відпустили палець - треба вирішити, куди летіти (вгору чи вниз)

panY.flattenOffset();


// Якщо потягнули різко вгору або пройшли половину шляху - відкриваємо

// gestureState.dy < 0 - це рух вгору

if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.moveY < SCREEN_HEIGHT - 200)) {

// Відкриваємо (їдемо в 0)

Animated.spring(panY, {

toValue: 0,

friction: 6,

tension: 50,

useNativeDriver: true,

}).start();

} else {

// Закриваємо (їдемо вниз до стопора)

Animated.spring(panY, {

toValue: maxOffset,

friction: 6,

tension: 50,

useNativeDriver: true,

}).start();

}

},

})

).current;



return (

<Animated.View

style={[

styles.container,

{

height: OPEN_HEIGHT,

transform: [

{

translateY: panY.interpolate({

inputRange: [-100, 0, maxOffset, maxOffset + 100],

outputRange: [-20, 0, maxOffset, maxOffset + 20], // Гумовий ефект

extrapolate: 'clamp',

}),

},

],

},

]}

>

{/* ✋ ЗОНА ДЛЯ СВАЙПУ (Тягни за неї) */}

<View {...panResponder.panHandlers} style={styles.dragHandleArea}>

<View style={styles.dragIndicator} />

</View>



{/* ВМІСТ ШТОРКИ */}

<View style={styles.content}>


{/* ВЕРХНЯ ЧАСТИНА (Завжди видно) */}

<View style={styles.headerRow}>

<Text style={styles.totalLabel}>До сплати:</Text>

<Text style={styles.totalPrice}>{totalAmount} ₴</Text>

</View>



<TouchableOpacity style={styles.orderButton} onPress={onOrder}>

<Text style={styles.orderButtonText}>Оформити замовлення</Text>

</TouchableOpacity>



{/* ПРИХОВАНИЙ КОНТЕНТ (Видно тільки коли витягнеш) */}

<View style={styles.detailsContainer}>

{/* Лінія розділювач */}

<View style={styles.divider} />


<View style={styles.detailRow}>

<Text style={styles.detailText}>Товари</Text>

<Text style={styles.detailPrice}>{totalAmount - 50} ₴</Text>

</View>

<View style={styles.detailRow}>

<Text style={styles.detailText}>Доставка</Text>

<Text style={styles.detailPrice}>50 ₴</Text>

</View>



{/* Менюшки */}

<TouchableOpacity style={styles.menuItem}>

<View style={{flexDirection:'row', alignItems:'center', gap: 10}}>

<Ionicons name="ticket-outline" size={24} color="#a855f7" />

<Text style={styles.menuText}>Промокод</Text>

</View>

<Ionicons name="chevron-forward" size={20} color="gray" />

</TouchableOpacity>



<TouchableOpacity style={styles.menuItem}>

<View style={{flexDirection:'row', alignItems:'center', gap: 10}}>

<Ionicons name="location-outline" size={24} color="white" />

<Text style={styles.menuText}>Оберіть адресу</Text>

</View>

<Text style={{color:'#a855f7'}}>Змінити</Text>

</TouchableOpacity>



<TouchableOpacity style={styles.menuItem}>

<View style={{flexDirection:'row', alignItems:'center', gap: 10}}>

<Ionicons name="logo-apple" size={24} color="white" />

<Text style={styles.menuText}>Apple Pay</Text>

</View>

<Ionicons name="chevron-forward" size={20} color="gray" />

</TouchableOpacity>



<TouchableOpacity style={{marginTop: 15}}>

<Text style={{color:'#a855f7', fontWeight:'bold'}}>+ Коментар до замовлення</Text>

</TouchableOpacity>

</View>

</View>

</Animated.View>

);

}



const styles = StyleSheet.create({

container: {

position: 'absolute',

bottom: 0,

left: 0,

right: 0,

backgroundColor: '#1c1c1e', // Темний фон як на скріні

borderTopLeftRadius: 24,

borderTopRightRadius: 24,

shadowColor: "#000",

shadowOffset: { width: 0, height: -5 },

shadowOpacity: 0.3,

shadowRadius: 10,

elevation: 20,

zIndex: 999,

},

dragHandleArea: {

width: '100%',

height: 30,

alignItems: 'center',

justifyContent: 'center',

backgroundColor: 'transparent',

},

dragIndicator: {

width: 40,

height: 4,

backgroundColor: '#555',

borderRadius: 2,

},

content: {

paddingHorizontal: 20,

flex: 1,

},

headerRow: {

flexDirection: 'row',

justifyContent: 'space-between',

alignItems: 'center',

marginBottom: 15,

},

totalLabel: {

color: 'white',

fontSize: 18,

fontWeight: 'bold',

},

totalPrice: {

color: 'white',

fontSize: 22,

fontWeight: 'bold',

},

orderButton: {

backgroundColor: '#d946ef', // Рожевий/Фіолетовий

paddingVertical: 16,

borderRadius: 16,

alignItems: 'center',

marginBottom: 20,

},

orderButtonText: {

color: 'white',

fontSize: 18,

fontWeight: 'bold',

},

// ДЕТАЛІ

detailsContainer: {

marginTop: 10,

},

divider: {

height: 1,

backgroundColor: '#333',

marginBottom: 15,

},

detailRow: {

flexDirection: 'row',

justifyContent: 'space-between',

marginBottom: 10,

},

detailText: { color: 'gray', fontSize: 16 },

detailPrice: { color: 'white', fontSize: 16 },

menuItem: {

flexDirection: 'row',

justifyContent: 'space-between',

alignItems: 'center',

backgroundColor: '#2c2c2e',

padding: 15,

borderRadius: 12,

marginTop: 10,

},

menuText: { color: 'white', fontSize: 16, fontWeight:'500' }

});