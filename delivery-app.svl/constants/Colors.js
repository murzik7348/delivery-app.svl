import { StyleSheet, Platform } from 'react-native';

const tintColorLight = '#e334e3';
const tintColorDark = '#e334e3';

const Colors = {
  light: {
    text: '#000000',
    textSecondary: '#666666',
    background: '#F8F9FA', // Slightly off-white for premium feel
    card: '#FFFFFF',
    input: '#F1F3F5',
    icon: '#000000',
    tabIconDefault: '#ADB5BD',
    tabIconSelected: tintColorLight,
    border: '#E9ECEF',
    subtleBorder: 'rgba(0,0,0,0.06)',
    separator: 'rgba(0,0,0,0.04)',
    modalOverlay: 'rgba(0,0,0,0.5)',
    tabBar: '#FFFFFF',
    primary: tintColorLight,
    success: '#2ECC71',
    warning: '#F39C12',
    danger: '#E74C3C',
    info: '#3498DB',
  },
  dark: {
    text: '#FFFFFF',
    textSecondary: '#9BA1A6',
    background: '#121212',
    card: '#1C1C1E',
    input: '#2C2C2E',
    icon: '#FFFFFF',
    tabIconDefault: '#48484A',
    tabIconSelected: tintColorDark,
    border: '#38383A',
    subtleBorder: 'rgba(255,255,255,0.1)',
    separator: 'rgba(255,255,255,0.06)',
    modalOverlay: 'rgba(0,0,0,0.7)',
    tabBar: '#1C1C1E',
    primary: tintColorDark,
    success: '#2ECC71',
    warning: '#F39C12',
    danger: '#E74C3C',
    info: '#3498DB',
  },
};

export const Shadows = {
  soft: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.22,
      shadowRadius: 16,
    },
    android: {
      elevation: 8,
    },
  }),
  primary: Platform.select({
    ios: {
      shadowColor: '#e334e3',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.22,
      shadowRadius: 12,
    },
    android: {
      elevation: 6,
    },
  }),
};

export const Glass = {
  light: {
    background: 'rgba(255, 255, 255, 0.75)',
    border: 'rgba(255, 255, 255, 0.5)',
    tint: 'light',
    intensity: 65,
  },
  dark: {
    background: 'rgba(28, 28, 30, 0.75)',
    border: 'rgba(255, 255, 255, 0.08)',
    tint: 'dark',
    intensity: 75,
  },
};

export const Strokes = {
  thin: StyleSheet.hairlineWidth,
  regular: 1,
  bold: 2,
};

export default Colors;