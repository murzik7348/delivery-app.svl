const fs = require('fs');
const path = require('path');

const folders = [
  'constants',
  'data',
  'services',
  'store',
  'app/(auth)',
  'app/(tabs)',
  'app/product',
  'app/checkout',
  'app/restaurant'
];

const files = {
  // 1. КОЛЬОРИ
  'constants/Colors.js': `export default { primary: '#44e3ff', secondary: '#e334e3', background: '#ffffff', card: '#F8F9FA', text: '#1a1a1a', gray: '#9BA1A6' };`,
  
  // 2. ДАНІ
  'data/mockData.js': `export const categories = [{id:1,name:'Бургери',image:'🍔'},{id:2,name:'Суші',image:'🍣'},{id:3,name:'Піца',image:'🍕'},{id:4,name:'Азія',image:'🍜'}]; 
export const restaurants = [{id:1,name:'Cyber Burger',rating:4.8,time:'25-30 хв',delivery:'Free',image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500',tags:['Бургери'],products:[{id:101,name:'Неон Чізбургер',price:180,desc:'Соковита котлета',image:'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500'},{id:102,name:'Фрі',price:70,desc:'Хрустка',image:'https://images.unsplash.com/photo-1573080496987-a199f8cd75c5?w=500'}]}];`,

  // 3. РОУТЕР
  'app/_layout.js': `import { Stack } from 'expo-router'; import { StatusBar } from 'expo-status-bar';
export default function Root() { return (<><StatusBar style="dark"/><Stack><Stack.Screen name="(tabs)" options={{headerShown:false}}/><Stack.Screen name="restaurant/[id]" options={{headerShown:false}}/></Stack></>); }`,
  
  // 4. ТАБИ (МЕНЮ)
  'app/(tabs)/_layout.js': `import { Tabs } from 'expo-router'; import { Ionicons } from '@expo/vector-icons'; import Colors from '../../constants/Colors';
export default function TabsLayout() { return ( <Tabs screenOptions={{headerShown:false, tabBarActiveTintColor: Colors.secondary}}> <Tabs.Screen name="index" options={{title:'Головна', tabBarIcon:({color})=><Ionicons name="home" size={24} color={color}/>}}/> <Tabs.Screen name="profile" options={{title:'Профіль', tabBarIcon:({color})=><Ionicons name="person" size={24} color={color}/>}}/> </Tabs> ); }`,

  // 5. ЗАГЛУШКИ
  'app/(tabs)/profile.js': `import {View,Text} from 'react-native'; export default function P(){return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Профіль</Text></View>}`,
  'app/(tabs)/search.js': `import {View,Text} from 'react-native'; export default function S(){return <View style={{flex:1,justifyContent:'center',alignItems:'center'}}><Text>Пошук</Text></View>}`,
};

console.log('🏗 Відновлюю файли...');
folders.forEach(dir => { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); });
Object.entries(files).forEach(([filePath, content]) => {
  if (!fs.existsSync(filePath)) { fs.writeFileSync(filePath, content); console.log(`✅ ${filePath}`); }
});