import { Platform, StyleSheet } from 'react-native';

export const Colors = {
  light: {
    text: '#000',
    textSecondary: '#666',
    background: '#fff',
    card: '#fff',
    input: '#f5f5f5',
    icon: '#000',
    tabIconDefault: '#ccc',
    tabIconSelected: '#e334e3',
    border: '#eee',
    subtleBorder: 'rgba(0,0,0,0.06)',
    modalOverlay: 'rgba(0,0,0,0.5)',
    tabBar: '#ffffff',
    separator: 'rgba(0,0,0,0.05)',
  },
  dark: {
    text: '#fff',
    textSecondary: '#aaa',
    background: '#121212',
    card: '#1E1E1E',
    input: '#2C2C2C',
    icon: '#fff',
    tabIconDefault: '#666',
    tabIconSelected: '#e334e3',
    border: '#333',
    subtleBorder: 'rgba(255,255,255,0.1)',
    modalOverlay: 'rgba(255,255,255,0.1)',
    tabBar: '#1E1E1E',
    separator: 'rgba(255,255,255,0.08)',
  },
};

export const Shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
    },
    android: {
      elevation: 4,
    },
  }),
  medium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
  premium: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.15,
      shadowRadius: 24,
    },
    android: {
      elevation: 12,
    },
  }),
};

export const Strokes = {
  thin: StyleSheet.hairlineWidth,
  regular: 1,
  bold: 2,
};

export const Radii = {
  small: 8,
  medium: 12,
  large: 18,
  xlarge: 24,
  full: 9999,
};

export default { Colors, Shadows, Strokes, Radii };
