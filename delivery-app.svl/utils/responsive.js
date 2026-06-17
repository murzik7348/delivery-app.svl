/**
 * responsive.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Адаптивна система масштабування без хардкоду базового пристрою.
 *
 * Принципи:
 *  - Діагональ в дюймах рахується з реального PixelRatio кожного девайса.
 *  - 375 / 812 — точки відліку дизайну (iPhone 13 mini / SE), НЕ база для lock-in.
 *  - moderateScale зменшує агресивність масштабу для комфортного UI.
 *  - Всі бордери через hairline() → PixelRatio.roundToNearestPixel.
 *  - useResponsiveDimensions() реагує на поворот екрану.
 *
 * Використання:
 *   import { hs, vs, ms, fs, r, hairline, useResponsiveDimensions, deviceCategory } from '../utils/responsive';
 *
 *   padding: hs(16)       // horizontal scale
 *   fontSize: fs(14)      // font scale (moderate, плавний)
 *   borderRadius: r(12)   // radius scale
 *   borderWidth: hairline() // 1 фізичний піксель
 *
 *   // В компоненті з поворотом:
 *   const { width, hs, vs } = useResponsiveDimensions();
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Dimensions, PixelRatio, useWindowDimensions } from 'react-native';
import { useMemo } from 'react';

// ─── Константи точок відліку дизайну ─────────────────────────────────────────
// Це НЕ "базовий пристрій" — це умовна сітка макету.
// Якщо дизайнер малював на iPhone 14 (390/844) — змінюй сюди.
const DESIGN_WIDTH  = 375;
const DESIGN_HEIGHT = 812;

// ─── Статичний snapshot при старті (для функцій поза компонентами) ───────────
const _static = Dimensions.get('window');

// ─── Внутрішні helpers ────────────────────────────────────────────────────────

/**
 * Рахує реальну діагональ екрану в дюймах.
 * PixelRatio.get() повертає відношення CSS-пікселів до фізичних.
 * PPI базових екранів ≈ 160 (Android mdpi baseline).
 */
function _calcDiagonalInches(width, height) {
  const density   = PixelRatio.get();
  const wInches   = width  / (density * 160);
  const hInches   = height / (density * 160);
  return Math.sqrt(wInches ** 2 + hInches ** 2);
}

/**
 * Категорія пристрою по реальній діагоналі в дюймах.
 * @returns {'compact'|'normal'|'large'|'tablet'}
 */
function _getCategory(diagonalInches) {
  if (diagonalInches < 4.5)  return 'compact';
  if (diagonalInches < 6.2)  return 'normal';
  if (diagonalInches < 6.9)  return 'large';
  return 'tablet';
}

// ─── Базові scale-функції (статичні, для StyleSheet.create) ──────────────────

/**
 * Горизонтальне масштабування. Для padding, margin, width.
 * @param {number} size — розмір з макету
 */
export function hs(size) {
  return size * (_static.width / DESIGN_WIDTH);
}

/**
 * Вертикальне масштабування. Для height, paddingVertical.
 * @param {number} size — розмір з макету
 */
export function vs(size) {
  return size * (_static.height / DESIGN_HEIGHT);
}

/**
 * Помірне масштабування. Золота середина між hs і оригінальним розміром.
 * Ідеально для fontSize, borderRadius, iconSize.
 * @param {number} size   — розмір з макету
 * @param {number} factor — 0 = не масштабує, 1 = повний hs. Default 0.5
 */
export function ms(size, factor = 0.5) {
  return size + (hs(size) - size) * factor;
}

/**
 * Font scale — moderateScale з фактором 0.4 (менш агресивний для тексту).
 * @param {number} size — розмір шрифту з макету
 */
export function fs(size) {
  return ms(size, 0.4);
}

/**
 * Border-radius scale — moderateScale з фактором 0.3.
 * @param {number} size — radius з макету
 */
export function r(size) {
  return ms(size, 0.3);
}

/**
 * 1 фізичний піксель, кратний сітці рендерингу пристрою.
 * Замінює StyleSheet.hairlineWidth для явного контролю.
 */
export function hairline() {
  return PixelRatio.roundToNearestPixel(1 / PixelRatio.get());
}

/**
 * Округлює будь-яке значення до найближчого цілого пікселя.
 * Використовуй для всіх бордерів і shadow values.
 */
export function px(value) {
  return PixelRatio.roundToNearestPixel(value);
}

// ─── Статичні значення категорії та діагоналі ────────────────────────────────

/** Реальна діагональ екрану в дюймах (snapshot при старті) */
export const diagonalInches = _calcDiagonalInches(_static.width, _static.height);

/** Категорія пристрою: 'compact' | 'normal' | 'large' | 'tablet' */
export const deviceCategory = _getCategory(diagonalInches);

/** true якщо планшет */
export const isTablet = deviceCategory === 'tablet';

/** true якщо маленький телефон */
export const isCompact = deviceCategory === 'compact';

// ─── Хук для реактивного масштабування (реагує на поворот) ───────────────────

/**
 * useResponsiveDimensions()
 *
 * Повертає всі scale-функції та поточні розміри екрану.
 * Перераховується автоматично при повороті пристрою.
 *
 * @example
 * const { width, height, hs, vs, ms, fs, r, category } = useResponsiveDimensions();
 * <View style={{ paddingHorizontal: hs(20), fontSize: fs(16) }} />
 */
export function useResponsiveDimensions() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const diagonal = _calcDiagonalInches(width, height);
    const category = _getCategory(diagonal);

    /** @param {number} size */
    const hsD  = (size) => size * (width / DESIGN_WIDTH);
    /** @param {number} size */
    const vsD  = (size) => size * (height / DESIGN_HEIGHT);
    /** @param {number} size @param {number} [factor=0.5] */
    const msD  = (size, factor = 0.5) => size + (hsD(size) - size) * factor;
    /** @param {number} size */
    const fsD  = (size) => msD(size, 0.4);
    /** @param {number} size */
    const rD   = (size) => msD(size, 0.3);

    return {
      // Розміри
      width,
      height,
      diagonal,
      category,
      isTablet:  category === 'tablet',
      isCompact: category === 'compact',
      isLarge:   category === 'large' || category === 'tablet',

      // Scale-функції (залежать від поточних width/height)
      hs:  hsD,
      vs:  vsD,
      ms:  msD,
      fs:  fsD,
      r:   rD,

      // Пікселі (не залежать від розмірів — однакові з модульними)
      px,
      hairline,
    };
  }, [width, height]);
}

// ─── Зручний об'єкт spacing для StyleSheet (статичний) ───────────────────────
/**
 * Готові адаптивні відступи для систематичного використання.
 * Базовий крок 4pt.
 *
 * @example
 * import { spacing } from '../utils/responsive';
 * padding: spacing.md   // 16
 * gap:     spacing.sm   // 8
 */
export const spacing = Object.freeze({
  xs:  px(hs(4)),
  sm:  px(hs(8)),
  md:  px(hs(16)),
  lg:  px(hs(24)),
  xl:  px(hs(32)),
  xxl: px(hs(48)),
});

/**
 * Готові адаптивні розміри шрифту.
 *
 * @example
 * import { typography } from '../utils/responsive';
 * fontSize: typography.body
 */
export const typography = Object.freeze({
  caption: fs(11),
  small:   fs(13),
  body:    fs(15),
  callout: fs(16),
  title3:  fs(18),
  title2:  fs(20),
  title1:  fs(24),
  large:   fs(28),
  hero:    fs(34),
});

/**
 * Готові адаптивні border-radius.
 */
export const radius = Object.freeze({
  xs:  r(6),
  sm:  r(10),
  md:  r(14),
  lg:  r(20),
  xl:  r(28),
  full: 9999,
});

/**
 * Готові розміри іконок.
 */
export const iconSize = Object.freeze({
  xs:  ms(14),
  sm:  ms(18),
  md:  ms(22),
  lg:  ms(28),
  xl:  ms(36),
});

// ─── DEBUG helper (тільки в __DEV__) ─────────────────────────────────────────
if (__DEV__) {
  const d = PixelRatio.get();
  console.log(
    `[responsive] ${_static.width}×${_static.height}pt | ` +
    `×${d} density | ` +
    `${diagonalInches.toFixed(2)}" | ` +
    `category: ${deviceCategory}`
  );
}
