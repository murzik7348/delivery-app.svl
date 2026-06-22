/**
 * Checks if a coordinate is inside a polygon using the Ray-Casting algorithm.
 * @param {Object} point - { latitude, longitude }
 * @param {Array} polygon - Array of { lat, lng }
 */
export function isPointInPolygon(point, polygon) {
  if (!point || !polygon || polygon.length < 3) return false;
  
  const x = point.longitude;
  const y = point.latitude;
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;
    
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  
  return inside;
}

/**
 * Calculates the 2D area of a polygon using the Shoelace formula.
 * @param {Array} points - Array of { lat, lng }
 * @returns {number} area value
 */
export function getPolygonArea(points) {
  if (!points || points.length < 3) return 0;
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    const xi = points[i].lng;
    const yi = points[i].lat;
    const xj = points[j].lng;
    const yj = points[j].lat;
    area += xi * yj - xj * yi;
  }
  return Math.abs(area / 2);
}

/**
 * Finds the applicable delivery zone for a given location.
 * Zones are sorted by priority ascending (1 is highest priority).
 * Overlapping zones with same priority are resolved by polygon area (smaller wins).
 * @param {Object} location - { latitude, longitude }
 * @param {Array} zones - Array of DeliveryZonesRequest
 */
export function getZoneForLocation(location, zones) {
  if (!location || !zones || zones.length === 0) return null;
  
  const matchingZones = zones.filter(zone => isPointInPolygon(location, zone.points));
  if (matchingZones.length === 0) return null;
  
  return [...matchingZones].sort((a, b) => {
    // 1. Sort by priority ascending (lower value = higher priority, e.g., 1 wins over 2)
    const prioA = a.priority !== null && a.priority !== undefined ? a.priority : 99999;
    const prioB = b.priority !== null && b.priority !== undefined ? b.priority : 99999;
    
    if (prioA !== prioB) {
      return prioA - prioB;
    }
    
    // 2. Secondary sort: polygon area ascending (smaller area = innermost zone = higher priority)
    const areaA = getPolygonArea(a.points);
    const areaB = getPolygonArea(b.points);
    return areaA - areaB;
  })[0];
}

/**
 * Resolves colors and labels for delivery zones.
 * Supports green/greenish/1 (salad green), yellow/2 (yellow), and red/3 (red) zones.
 * @param {string} name - Zone name
 */
export function getZoneColor(name) {
  const lowerName = String(name || '').toLowerCase();
  
  if (lowerName.includes('зелен') || lowerName.includes('green') || lowerName.includes('1')) {
    return {
      fill: 'rgba(139, 195, 74, 0.25)', // Salad Green
      stroke: '#8BC34A',
      text: '#558B2F',
      displayName: 'Зелена зона'
    };
  }
  
  if (lowerName.includes('жовт') || lowerName.includes('yellow') || lowerName.includes('2')) {
    return {
      fill: 'rgba(255, 202, 40, 0.25)', // Yellow
      stroke: '#FFCA28',
      text: '#F57F17',
      displayName: 'Жовта зона'
    };
  }
  
  if (lowerName.includes('червон') || lowerName.includes('red') || lowerName.includes('3')) {
    return {
      fill: 'rgba(244, 67, 54, 0.25)', // Red
      stroke: '#F44336',
      text: '#C62828',
      displayName: 'Червона зона'
    };
  }
  
  return {
    fill: 'rgba(0, 122, 255, 0.22)', // Blue fallback
    stroke: '#007AFF',
    text: '#0059B3',
    displayName: name || 'Зона доставки'
  };
}
