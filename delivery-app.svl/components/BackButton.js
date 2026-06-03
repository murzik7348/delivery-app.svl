import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { safeBack } from '../utils/navigation';
import * as Haptics from 'expo-haptics';
import { useColorScheme } from '../hooks/use-color-scheme';
import Colors from '../constants/Colors';

export default function BackButton({ color, onPress }) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = Colors[colorScheme ?? 'light'];
  const activeColor = color || theme.text;
  
  const handlePress = () => {
    Haptics.selectionAsync();
    if (onPress) {
      onPress();
    } else {
      safeBack(router);
    }
  };

  return (
    <TouchableOpacity 
      style={styles.btn}
      activeOpacity={0.7}
      onPress={handlePress}
    >
      <Ionicons name="arrow-back" size={26} color={activeColor} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.02)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(0,0,0,0.05)',
  }
});
