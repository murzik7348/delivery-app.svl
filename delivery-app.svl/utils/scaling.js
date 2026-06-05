import { useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Базові розміри макету (iPhone 11/13 Pro), відносно яких рахується масштабування
export const GUIDELINE_BASE_WIDTH = 390;
export const GUIDELINE_BASE_HEIGHT = 844;
export const GUIDELINE_BASE_DIAGONAL = Math.sqrt(
  GUIDELINE_BASE_WIDTH * GUIDELINE_BASE_WIDTH + GUIDELINE_BASE_HEIGHT * GUIDELINE_BASE_HEIGHT
);

/**
 * Хук для отримання адаптивних розмірів, безпечних зон (Safe Area Insets)
 * та функції масштабування інтерфейсу на основі діагоналі екрану.
 */
export function useResponsive() {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Рахуємо діагональ екрану в поінтіх (Points)
  const screenDiagonal = Math.sqrt(width * width + height * height);

  // Коефіцієнт масштабування інтерфейсу на основі діагоналі
  const scaleMultiplier = screenDiagonal / GUIDELINE_BASE_DIAGONAL;

  // Функція адаптивного розміру (для шрифтів, падінгів, іконок)
  const scale = (size) => Math.round(size * scaleMultiplier);

  return {
    width,
    height,
    insets,
    screenDiagonal,
    scaleMultiplier,
    scale,
  };
}
