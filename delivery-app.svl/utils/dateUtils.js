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

/**
 * Checks if a restaurant is currently closed based on its workTimes array.
 * @param {Object} restaurant 
 * @returns {boolean}
 */
export function isRestaurantClosed(restaurant) {
  if (!restaurant || !restaurant.workTimes || restaurant.workTimes.length === 0) {
    return false;
  }
  
  const jsDay = new Date().getDay();
  // Map JS Sunday (0) to 7, otherwise keep same (1-6)
  const backendDay = jsDay === 0 ? 7 : jsDay;
  
  const todayWorkTime = restaurant.workTimes.find(w => w.dayOfWeek === backendDay);
  
  if (!todayWorkTime) {
    return false;
  }
  
  if (!todayWorkTime.isWorking) {
    return true;
  }
  
  const timeToSeconds = (timeStr) => {
    if (!timeStr) return 0;
    const parts = timeStr.split(':').map(Number);
    const h = parts[0] || 0;
    const m = parts[1] || 0;
    const s = parts[2] || 0;
    return h * 3600 + m * 60 + s;
  };
  
  const now = new Date();
  const currentTotalSeconds = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  const openSeconds = timeToSeconds(todayWorkTime.openTime);
  const closedSeconds = timeToSeconds(todayWorkTime.closedTime);
  
  if (openSeconds <= closedSeconds) {
    return currentTotalSeconds < openSeconds || currentTotalSeconds > closedSeconds;
  } else {
    // Spans midnight
    return currentTotalSeconds < openSeconds && currentTotalSeconds > closedSeconds;
  }
}

/**
 * Returns formatted closing time for today (e.g. "до 22:00" or "Зачинено")
 * @param {Object} restaurant 
 * @returns {string}
 */
export function getRestaurantTodayWorkTime(restaurant) {
  if (!restaurant || !restaurant.workTimes || restaurant.workTimes.length === 0) {
    return 'з 08:00 до 22:00'; // Default fallback
  }
  
  const jsDay = new Date().getDay();
  const backendDay = jsDay === 0 ? 7 : jsDay;
  const todayWorkTime = restaurant.workTimes.find(w => w.dayOfWeek === backendDay);
  
  if (!todayWorkTime || !todayWorkTime.isWorking) {
    return 'Зачинено';
  }
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '';
    const parts = timeStr.split(':');
    return `${parts[0] || '00'}:${parts[1] || '00'}`;
  };
  
  return `з ${formatTime(todayWorkTime.openTime)} до ${formatTime(todayWorkTime.closedTime)}`;
}
