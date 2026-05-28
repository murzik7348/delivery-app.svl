import React, { useEffect, useRef } from 'react';
import { Animated, View, StyleSheet, useColorScheme } from 'react-native';

export const Skeleton = ({ width, height, borderRadius = 8, style }) => {
  const colorScheme = useColorScheme();
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, []);

  const bgColor = colorScheme === 'dark' ? '#2C2C2E' : '#E5E5EA';

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius,
          backgroundColor: bgColor,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
};

export const CatalogSkeleton = () => {
  return (
    <View style={styles.container}>
      {/* Horizontal categories list skeleton */}
      <View style={styles.row}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.categoryItem}>
            <Skeleton width={68} height={68} borderRadius={34} />
            <Skeleton width={50} height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>

      {/* Grid skeleton */}
      <View style={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <View key={i} style={styles.gridItem}>
            <Skeleton width="100%" height={120} borderRadius={16} />
            <Skeleton width="80%" height={16} borderRadius={4} style={{ marginTop: 10 }} />
            <Skeleton width="40%" height={14} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        ))}
      </View>
    </View>
  );
};

export const StoreListSkeleton = () => {
  return (
    <View style={styles.storeList}>
      {[1, 2].map((i) => (
        <View key={i} style={styles.storeCard}>
          <Skeleton width="100%" height={180} borderRadius={24} />
          <View style={styles.storeInfo}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Skeleton width="60%" height={20} borderRadius={4} />
              <Skeleton width="15%" height={16} borderRadius={4} />
            </View>
            <Skeleton width="40%" height={12} borderRadius={4} style={{ marginTop: 8 }} />
          </View>
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 24,
    justifyContent: 'space-between',
  },
  categoryItem: {
    alignItems: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  gridItem: {
    width: '48%',
    marginBottom: 20,
  },
  storeList: {
    paddingHorizontal: 20,
    marginTop: 15,
  },
  storeCard: {
    marginBottom: 24,
    borderRadius: 24,
  },
  storeInfo: {
    padding: 14,
  },
});
