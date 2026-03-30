/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#0a0514', // Дуже глибокий фіолетовий/чорний
        surface: '#150a21',    // Трохи світліший фіолетовий для карток
        surfaceLighter: '#201032', // Ще світліший для hover та акцентів
        primary: '#E22BC6',    // Electric pink
        primaryHover: '#f53ae8',
        secondary: '#FFB800',  // Bright yellow
        success: '#10B981',    // Emerald
        danger: '#EF4444',     // Red
        textPrimary: '#F3F4F6', // Майже білий
        textSecondary: '#9CA3AF', // Світло сірий
        borderWhite: 'rgba(255, 255, 255, 0.1)',
        borderPrimary: 'rgba(226, 43, 198, 0.3)',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'primary-gradient': 'linear-gradient(135deg, #E22BC6 0%, #FF5C00 100%)',
      },
      boxShadow: {
        'glow-primary': '0 0 15px -3px rgba(226, 43, 198, 0.4)',
        'glow-secondary': '0 0 15px -3px rgba(255, 184, 0, 0.4)',
      }
    },
  },
  plugins: [],
}
