export const formatOrderNumber = (id) => {
  if (!id) return '#00000';
  
  if (typeof id === 'string' && id.startsWith('#')) return id;
  
  const num = parseInt(id, 10);
  if (isNaN(num)) return `#${id}`;
  
  return `#${num.toString().padStart(5, '0')}`;
};
