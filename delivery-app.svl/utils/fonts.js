import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  useFonts,
} from '@expo-google-fonts/inter';

// Keep the splash screen visible while fonts load
try {
  SplashScreen.preventAutoHideAsync();
} catch (e) {
  console.warn('[fonts] SplashScreen.preventAutoHideAsync failed:', e);
}

/**
 * useAppFonts()
 * Load Inter font family, hide the splash screen once ready.
 *
 * @returns {{ fontsLoaded: boolean, fontError: Error|null }}
 */
export function useAppFonts() {
  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  return { fontsLoaded, fontError };
}

// ── Font name constants ────────────────────────────────────────────────────────
// Use these in StyleSheet.create for explicit per-component overrides.
export const FONTS = {
  regular:   'Inter_400Regular',
  medium:    'Inter_500Medium',
  semiBold:  'Inter_600SemiBold',
  bold:      'Inter_700Bold',
};
