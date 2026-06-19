import { useColorScheme as useNativeColorScheme } from 'react-native';

export function useColorScheme() {
  const systemColorScheme = useNativeColorScheme();
  return systemColorScheme || 'light';
}
