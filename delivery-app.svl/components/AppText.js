import React from 'react';
import { Text as RNText, StyleSheet } from 'react-native';

const styles = StyleSheet.create({
  body: {
    fontSize: 16,
    lineHeight: 24,
  },
  heading: {
    fontSize: 22,
    lineHeight: 28,
  },
  caption: {
    fontSize: 12,
    lineHeight: 16,
    opacity: 0.7,
  },
  button: {
    fontSize: 16,
    lineHeight: 22,
  },
});

function getFontFamily(variant, style) {
  // Flatten styles to inspect them
  const flat = StyleSheet.flatten(style) || {};
  if (flat.fontFamily) return flat.fontFamily;

  const weight = flat.fontWeight;
  if (weight === 'bold' || weight === '700' || weight === '800' || weight === '900') {
    return 'Inter_700Bold';
  }
  if (weight === '600') {
    return 'Inter_600SemiBold';
  }
  if (weight === '500') {
    return 'Inter_500Medium';
  }

  // Fallback to variant defaults
  if (variant === 'heading') return 'Inter_600SemiBold';
  if (variant === 'button') return 'Inter_500Medium';
  return 'Inter_400Regular';
}

/**
 * <AppText>
 * Custom replacement for React Native's <Text> component.
 * Automatically applies Inter fonts based on style/variant/fontWeight.
 *
 * Props:
 *   variant - 'body' | 'heading' | 'caption' | 'button' (default: 'body')
 *   style   - standard RN text style
 */
export const AppText = React.forwardRef(({ variant = 'body', style, ...props }, ref) => {
  const variantStyle = styles[variant] || styles.body;
  const fontFamily = getFontFamily(variant, style);

  // Strip fontWeight if we resolved it to an Inter font family on Android to avoid synthetic bolding issues
  const cleanStyle = StyleSheet.flatten(style) || {};
  if (fontFamily !== 'Inter_400Regular') {
    delete cleanStyle.fontWeight;
  }

  return (
    <RNText
      ref={ref}
      style={[
        variantStyle,
        { fontFamily },
        cleanStyle,
      ]}
      {...props}
    />
  );
});

export default AppText;
