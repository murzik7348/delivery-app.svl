import { Redirect } from 'expo-router';

export default function Index() {
  // Цей файл просто перекидає нас на головну вкладку
  return <Redirect href="/(tabs)" />;
}