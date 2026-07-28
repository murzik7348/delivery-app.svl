/**
 * Safe numeric parser utility.
 * Cleans string formatted values (e.g. "220 ₴", "150.00 грн") and converts to a valid finite number.
 * Returns 0 if parsing fails or result is not finite.
 * @param {any} value - Value to parse
 * @returns {number} Safe finite number
 */
export const safeNum = (value) => {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }
  if (!value) return 0;
  
  const clean = String(value).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(clean);
  return Number.isFinite(parsed) ? parsed : 0;
};
