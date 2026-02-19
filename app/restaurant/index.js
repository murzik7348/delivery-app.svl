import { Redirect } from 'expo-router';

export default function Index() {
  // Цей рядок каже: "Як тільки запустився - перекинь на сторінку входу"
  return <Redirect href="/(auth)/login" />;
}