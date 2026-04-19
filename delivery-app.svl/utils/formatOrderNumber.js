export const formatOrderNumber = (id) => {
  if (!id) return '#00000';
  
  // Якщо бекенд вже повертає рядок формату #10023, просто повертаємо його
  if (typeof id === 'string' && id.startsWith('#')) return id;
  
  // Якщо ID це число (або рядок, що містить тільки цифри), перетворюємо в єдиний формат
  const num = parseInt(id, 10);
  if (isNaN(num)) return `#${id}`;
  
  // Форматуємо як мінімум 5-значне число: 23 -> #00023
  return `#${num.toString().padStart(5, '0')}`;
};
