import React, { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import * as LiveActivity from 'expo-live-activity';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { FlatList, Image, StyleSheet, Text, TouchableOpacity, View, useColorScheme, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { useLiveActivity } from '../hooks/useLiveActivity';
import Colors from '../constants/Colors';
import { t } from '../constants/translations';

// Новий компонент таймлайну
function OrderStatusTimeline({ steps, theme }) {
  const MAGENTA = '#E22BC6'; // Неоновий колір
  const InactiveGray = '#2C2C2E'; // Темно-сірий для майбутніх ліній і кружечків
  const TextGray = '#7A7A7F'; // Колір тексту для ще неактивних статусів

  const cardBg = theme?.card || '#1E1E1E';

  return (
    <View style={{ width: '100%' }}>
      {steps.map((step, index) => {
        const isActive = step.isCompleted || step.isCurrent;
        const isLineActive = step.isCompleted;
        const isLast = index === steps.length - 1;

        return (
          <View key={step.id} style={timelineStyles.row}>
            {/* КОЛОНКА 1: ЧАС */}
            <View style={timelineStyles.timeContainer}>
              <Text style={[timelineStyles.timeText, { color: isActive ? theme.text : TextGray }]}>
                {step.time || '--:--'}
              </Text>
            </View>

            {/* КОЛОНКА 2: КРУЖЕЧОК ТА ЛІНІЯ */}
            <View style={timelineStyles.indicatorContainer}>
              {!isLast && (
                <View
                  style={[
                    timelineStyles.verticalLine,
                    { backgroundColor: isLineActive ? MAGENTA : InactiveGray }
                  ]}
                />
              )}

              {/* Кружечок-індикатор */}
              {step.isCurrent ? (
                <View style={[timelineStyles.circleOuterCurrent, { backgroundColor: cardBg }]}>
                  <View style={timelineStyles.circleInnerCurrent} />
                </View>
              ) : step.isCompleted ? (
                <View style={timelineStyles.circleCompleted}>
                  <Ionicons name="checkmark" size={12} color="white" style={timelineStyles.checkIcon} />
                </View>
              ) : (
                <View style={timelineStyles.circleFuture} />
              )}
            </View>

            {/* КОЛОНКА 3: НАЗВА СТАТУСУ */}
            <View style={timelineStyles.titleContainer}>
              <Text
                style={[
                  timelineStyles.titleText,
                  {
                    color: isActive ? theme.text : TextGray,
                    fontWeight: step.isCurrent ? 'bold' : '600'
                  }
                ]}
              >
                {step.title}
              </Text>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export default function OrderDetailsScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const locale = useSelector(s => s.language?.locale ?? 'uk');

  const order = useSelector((state) =>
    state.orders.orders.find((o) => o.id === id)
  );

  if (!order) {
    return (
      <SafeAreaView style={[styles.center, { backgroundColor: theme.background }]}>
        <Text style={{ color: theme.text }}>{t(locale, 'orderNotFound')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Text style={{ color: 'white' }}>{t(locale, 'back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  // Розрахунок поточного статусу на основі Redux
  const activeStatus = order.status || 'accepted';
  let currentStep = 0;
  if (activeStatus === 'preparing') currentStep = 1;
  if (activeStatus === 'delivering') currentStep = 2;
  if (activeStatus === 'completed') currentStep = 3;

  // Витягуємо реальні таймстемпи замовлення з Redux (встановлюються через Admin Screen)
  const timestamps = order.statusTimestamps || {};

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>

      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{t(locale, 'orderHash')}{order.id.slice(-4)}</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* ГОЛОВНИЙ СПИСОК */}
      <FlatList
        data={order.items}
        keyExtractor={(item, index) => item.id ? item.id.toString() : index.toString()}
        contentContainerStyle={{ padding: 20, paddingBottom: 50 }}
        ListHeaderComponent={
          <>
            {/* Кур'єр */}
            <View style={[styles.card, { backgroundColor: theme.card, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={{ uri: 'https://randomuser.me/api/portraits/men/32.jpg' }}
                  style={styles.avatar}
                />
                <View style={{ marginLeft: 15 }}>
                  <Text style={[styles.name, { color: theme.text }]}>Олександр</Text>
                  <Text style={{ color: 'gray', fontSize: 12 }}>{t(locale, 'courier')} • ⭐ 4.9</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => Alert.alert(t(locale, 'call'), t(locale, 'calling'))} style={styles.callBtn}>
                <Ionicons name="call" size={20} color="white" />
              </TouchableOpacity>
            </View>

            {/* Статуси */}
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t(locale, 'deliveryStatus')}</Text>

            {/* НОВИЙ КОМПОНЕНТ ТАЙМЛАЙНУ */}
            <View style={[styles.card, { backgroundColor: theme.card, paddingVertical: 20 }]}>
              {/* Генеруємо актуальні кроки з реальними таймстемпами */}
              {(() => {
                const formatTime = (ts) => {
                  if (!ts) return null;
                  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });
                };

                const stepsData = [
                  { id: 1, title: locale === 'en' ? 'Accepted ✅' : 'Прийнято ✅', time: formatTime(timestamps['accepted']), isCompleted: currentStep > 0, isCurrent: currentStep === 0 },
                  { id: 2, title: locale === 'en' ? 'Preparing 👨‍🍳' : 'Готується 👨‍🍳', time: formatTime(timestamps['preparing']), isCompleted: currentStep > 1, isCurrent: currentStep === 1 },
                  { id: 3, title: locale === 'en' ? 'On the way 🛵' : "Кур'єр їде 🛵", time: formatTime(timestamps['delivering']), isCompleted: currentStep > 2, isCurrent: currentStep === 2 },
                  { id: 4, title: locale === 'en' ? 'Delivered 🎉' : 'Доставлено 🎉', time: formatTime(timestamps['completed']), isCompleted: currentStep > 3, isCurrent: currentStep === 3 },
                ];

                return <OrderStatusTimeline steps={stepsData} theme={theme} />;
              })()}
            </View>

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>{t(locale, 'items')}</Text>
          </>
        }

        renderItem={({ item }) => (
          <View style={[styles.itemRow, { borderBottomColor: theme.border }]}>
            <Text style={{ fontWeight: 'bold', marginRight: 10, color: theme.text }}>{item.quantity}x</Text>
            <Text style={{ flex: 1, color: theme.text, fontSize: 16 }}>{item.name}</Text>
            <Text style={{ fontWeight: 'bold', color: theme.text }}>{item.price * item.quantity} ₴</Text>
          </View>
        )}

        ListFooterComponent={
          <>
            <View style={[styles.card, { backgroundColor: theme.card, marginTop: 20 }]}>
              <View style={styles.infoRow}>
                <Text style={{ color: 'gray' }}>{t(locale, 'date')}</Text>
                <Text style={{ color: theme.text, fontWeight: 'bold' }}>
                  {new Date(order.date).toLocaleString(locale === 'en' ? 'en-US' : 'uk-UA')}
                </Text>
              </View>
              <View style={{ height: 1, backgroundColor: theme.border, marginVertical: 10 }} />
              <View style={styles.infoRow}>
                <Text style={{ color: 'gray' }}>{t(locale, 'amount')}</Text>
                <Text style={{ color: '#e334e3', fontWeight: 'bold', fontSize: 24 }}>{order.total} ₴</Text>
              </View>
            </View>
          </>
        }
      />
    </SafeAreaView>
  );
}

const timelineStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    width: '100%',
    minHeight: 60, // Забезпечує достатньо місця для вертикальної лінії між кроками
  },
  timeContainer: {
    width: 50, // Фіксована ширина, щоб статуси були ідеально вирівняні
    paddingTop: 2,
  },
  timeText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'left',
  },
  indicatorContainer: {
    width: 40,
    alignItems: 'center',
    position: 'relative',
    zIndex: 10,
  },
  verticalLine: {
    position: 'absolute',
    top: 24, // Відступ зверху, щоб лінія починалась під кружечком
    left: 19, // Точно по центру колонки 40px (враховуючи товщину лінії)
    width: 2,
    height: '100%', // Лінія тягнеться до наступного рядка
    zIndex: 1,
  },
  circleCompleted: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E22BC6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  checkIcon: {
    marginTop: 1,
  },
  circleOuterCurrent: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E22BC6',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    shadowColor: '#E22BC6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
  circleInnerCurrent: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#E22BC6',
  },
  circleFuture: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2C2C2E',
    zIndex: 10,
  },
  titleContainer: {
    flex: 1,
    paddingLeft: 4,
    paddingTop: 2,
  },
  titleText: {
    fontSize: 16.5,
  },
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, alignItems: 'center' },
  title: { fontSize: 20, fontWeight: 'bold' },
  backButton: { marginTop: 10, backgroundColor: '#e334e3', padding: 10, borderRadius: 8 },
  card: { padding: 16, borderRadius: 16, marginBottom: 20 },
  avatar: { width: 50, height: 50, borderRadius: 25 },
  name: { fontSize: 18, fontWeight: 'bold' },
  callBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2ecc71', justifyContent: 'center', alignItems: 'center' },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10 },
  itemRow: { flexDirection: 'row', paddingVertical: 12, borderBottomWidth: 1, alignItems: 'center' },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }
});
