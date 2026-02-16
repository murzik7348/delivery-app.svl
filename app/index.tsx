import 'react-native-gesture-handler';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

export default function Index() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>БЛЯТЬ, ВОНО ПРАЦЮЄ! 🎉</Text>
      <Text style={styles.sub}>Якщо ти це бачиш — ми перемогли версії.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
  },
  sub: {
    color: '#888',
    marginTop: 10,
  }
});