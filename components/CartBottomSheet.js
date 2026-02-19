import React, { useRef, useState } from 'react';
import {
  View, Text, StyleSheet, Dimensions, Animated, 
  PanResponder, TouchableOpacity, TextInput, LayoutAnimation, KeyboardAvoidingView, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const CLOSED_HEIGHT = 120; 
const OPEN_HEIGHT = SCREEN_HEIGHT * 0.75; 

export default function CartBottomSheet({ 
  totalAmount, subtotal, deliveryFee, discountAmount, deliveryType,
  appliedPromo, userAddress, paymentInfo, orderNote,
  onOrder, onOpenPromo, onOpenAddress, onOpenPayment, onNoteChange
}) {
  const maxOffset = OPEN_HEIGHT - CLOSED_HEIGHT;
  const panY = useRef(new Animated.Value(maxOffset)).current;
  const [isNoteVisible, setIsNoteVisible] = useState(false);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 5,
      onPanResponderGrant: () => panY.extractOffset(),
      onPanResponderMove: (_, gestureState) => panY.setValue(gestureState.dy),
      onPanResponderRelease: (_, gestureState) => {
        panY.flattenOffset();
        if (gestureState.dy < -50 || (gestureState.dy < 0 && gestureState.moveY < SCREEN_HEIGHT - 200)) {
          Animated.spring(panY, { toValue: 0, friction: 6, tension: 50, useNativeDriver: true }).start();
        } else {
          Animated.spring(panY, { toValue: maxOffset, friction: 6, tension: 50, useNativeDriver: true }).start();
        }
      },
    })
  ).current;

  // Захист від NaN (якщо дані ще не підвантажились)
  const safeTotal = parseFloat(totalAmount) || 0;
  const safeSubtotal = parseFloat(subtotal) || 0;
  const safeDelivery = parseFloat(deliveryFee) || 0;
  const safeDiscount = parseFloat(discountAmount) || 0;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          height: OPEN_HEIGHT,
          transform: [{
            translateY: panY.interpolate({
              inputRange: [-200, 0, maxOffset, maxOffset + 200],
              outputRange: [-50, 0, maxOffset, maxOffset + 50],
              extrapolate: 'clamp',
            }),
          }],
        },
      ]}
    >
      {/* Зона, за яку тягнемо */}
      <View {...panResponder.panHandlers} style={styles.dragHandleArea}>
        <View style={styles.dragIndicator} />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.content}>
        
        <View style={styles.headerRow}>
          <Text style={styles.totalLabel}>До сплати:</Text>
          <Text style={styles.totalPrice}>{safeTotal} ₴</Text>
        </View>

        <TouchableOpacity style={styles.orderButton} onPress={onOrder} activeOpacity={0.8}>
          <Text style={styles.orderButtonText}>Оформити замовлення</Text>
        </TouchableOpacity>

        <View style={styles.detailsContainer}>
           <View style={styles.divider} />
           
           <View style={styles.detailRow}>
             <Text style={styles.detailText}>Товари</Text>
             <Text style={styles.detailPrice}>{safeSubtotal} ₴</Text>
           </View>

           {deliveryType === 'delivery' && (
             <View style={styles.detailRow}>
               <Text style={styles.detailText}>Доставка</Text>
               <Text style={styles.detailPrice}>{safeDelivery === 0 ? 'Безкоштовно' : `${safeDelivery} ₴`}</Text>
             </View>
           )}

           {safeDiscount > 0 && (
             <View style={styles.detailRow}>
               <Text style={{ color: '#e334e3', fontSize: 16 }}>Знижка</Text>
               <Text style={{ color: '#e334e3', fontSize: 16 }}>- {safeDiscount} ₴</Text>
             </View>
           )}

           <TouchableOpacity style={styles.menuItem} onPress={onOpenPromo} activeOpacity={0.7}>
             <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                <Ionicons name="ticket-outline" size={24} color="#e334e3" />
                <Text style={styles.menuText}>{appliedPromo ? appliedPromo.code : 'Промокод'}</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color="gray" />
           </TouchableOpacity>

           {deliveryType === 'delivery' && (
             <TouchableOpacity style={styles.menuItem} onPress={onOpenAddress} activeOpacity={0.7}>
               <View style={{flexDirection:'row', alignItems:'center', gap: 10, flex: 1}}>
                  <Ionicons name="location-outline" size={24} color="white" />
                  <Text style={styles.menuText} numberOfLines={1}>{userAddress}</Text>
               </View>
               <Text style={{color: '#e334e3', fontSize: 12}}>Змінити</Text>
             </TouchableOpacity>
           )}

           <TouchableOpacity style={styles.menuItem} onPress={onOpenPayment} activeOpacity={0.7}>
             <View style={{flexDirection:'row', alignItems:'center', gap: 10}}>
                <Ionicons name={paymentInfo?.icon || 'logo-apple'} size={24} color="white" />
                <Text style={styles.menuText}>{paymentInfo?.name || 'Оплата'}</Text>
             </View>
             <Ionicons name="chevron-forward" size={20} color="gray" />
           </TouchableOpacity>
           
           <View style={{ marginTop: 15, paddingBottom: 20 }}>
             {!isNoteVisible && !orderNote ? (
               <TouchableOpacity onPress={() => { LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut); setIsNoteVisible(true); }}>
                   <Text style={{ color: '#e334e3', fontWeight: 'bold' }}>+ Коментар до замовлення</Text>
               </TouchableOpacity>
             ) : (
               <View style={styles.noteContainer}>
                 <TextInput 
                   style={styles.noteInput} 
                   placeholder="Код домофону, прибори..." 
                   placeholderTextColor="gray" 
                   value={orderNote} 
                   onChangeText={onNoteChange} 
                   multiline 
                 />
               </View>
             )}
           </View>
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    backgroundColor: '#1c1c1e', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: -5 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 20, zIndex: 999,
  },
  dragHandleArea: { width: '100%', height: 30, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  dragIndicator: { width: 40, height: 4, backgroundColor: '#555', borderRadius: 2 },
  content: { paddingHorizontal: 20, flex: 1 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  totalLabel: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  totalPrice: { color: 'white', fontSize: 22, fontWeight: 'bold' },
  orderButton: { backgroundColor: '#d946ef', paddingVertical: 16, borderRadius: 16, alignItems: 'center', marginBottom: 20 },
  orderButtonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  detailsContainer: { marginTop: 10 },
  divider: { height: 1, backgroundColor: '#333', marginBottom: 15 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  detailText: { color: 'gray', fontSize: 16 },
  detailPrice: { color: 'white', fontSize: 16 },
  menuItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#2c2c2e', padding: 15, borderRadius: 12, marginTop: 10 },
  menuText: { color: 'white', fontSize: 16, fontWeight:'500' },
  noteContainer: { backgroundColor: '#2c2c2e', borderRadius: 12, padding: 10 },
  noteInput: { color: 'white', fontSize: 14, maxHeight: 60 },
});