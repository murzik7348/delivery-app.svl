import { Redirect } from 'expo-router';
import { useSelector } from 'react-redux';

export default function Index() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Якщо не залогінений — на авторизацію, якщо залогінений — на таби
  if (!isAuthenticated) {
    return <Redirect href="/(auth)/authscreen" />;
  }

  return <Redirect href="/(tabs)" />;
}