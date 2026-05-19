import { useColorScheme as useNativeColorScheme } from 'react-native';
import { useSelector } from 'react-redux';

export function useColorScheme() {
  const reduxTheme = useSelector((state: any) => state.ui?.theme);
  const systemColorScheme = useNativeColorScheme();
  return reduxTheme || systemColorScheme || 'light';
}
