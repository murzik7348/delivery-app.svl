/**
 * formatUkraineDate — formats dates to display in the device's local timezone.
 * 
 * Uses native JS Date methods which always reflect the device timezone
 * (so if the phone clock shows 16:18, this will also show 16:18).
 * 
 * @param {string|Date} isoDate — ISO date string or Date object
 * @param {object} options — optional: { dateOnly: bool, timeOnly: bool }
 * @returns {string} human-readable date in device local time
 */
export function formatUkraineDate(isoDate, options = {}) {
  if (!isoDate) return '—';
  
  const d = new Date(isoDate);
  if (isNaN(d.getTime())) return '—';

  const pad = (n) => String(n).padStart(2, '0');

  const day   = pad(d.getDate());
  const month = pad(d.getMonth() + 1);
  const year  = d.getFullYear();
  const hours = pad(d.getHours());
  const mins  = pad(d.getMinutes());

  if (options.dateOnly) return `${day}.${month}.${year}`;
  if (options.timeOnly) return `${hours}:${mins}`;
  return `${day}.${month}.${year}, ${hours}:${mins}`;
}
