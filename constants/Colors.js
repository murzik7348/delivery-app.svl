const tintColorLight = '#e334e3';
const tintColorDark = '#e334e3';

export default {
  light: {
    text: '#000',
    textSecondary: '#666',
    background: '#fff',
    card: '#fff',
    input: '#f5f5f5',
    icon: '#000',
    tabIconDefault: '#ccc',
    tabIconSelected: tintColorLight,
    border: '#eee',
    modalOverlay: 'rgba(0,0,0,0.5)',
    // 👇 Колір нижнього меню для світлої теми
    tabBar: '#ffffff', 
  },
  dark: {
    text: '#fff',
    textSecondary: '#aaa',
    background: '#121212',
    card: '#1E1E1E',
    input: '#2C2C2C',
    icon: '#fff',
    tabIconDefault: '#666', // Сірі іконки, коли не активні
    tabIconSelected: tintColorDark,
    border: '#333',
    modalOverlay: 'rgba(255,255,255,0.1)',
    // 👇 Колір нижнього меню для темної теми (Темно-сірий, як картки)
    tabBar: '#1E1E1E', 
  },
};