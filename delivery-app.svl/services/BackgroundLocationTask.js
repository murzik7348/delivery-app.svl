import { courierUpdateLocation } from '../src/api';

export const LOCATION_TASK_NAME = 'background-location-task';

try {
  const TaskManager = require('expo-task-manager');
  if (TaskManager && TaskManager.defineTask) {
    TaskManager.defineTask(LOCATION_TASK_NAME, async ({ data, error }) => {
      if (error) {
        console.error('[Background Location Task] Error:', error);
        return;
      }
      if (data) {
        const { locations } = data;
        if (locations && locations.length > 0) {
          const { latitude, longitude } = locations[0].coords;
          console.log(`📍 [Courier GPS Background] Location updated: lat=${latitude}, lng=${longitude}`);
          try {
            await courierUpdateLocation(latitude, longitude);
          } catch (err) {
            console.warn('[Courier GPS Background] Failed to send location:', err.message || err);
          }
        }
      }
    });
  }
} catch (e) {
  console.warn('⚠️ [Background Location Task] Failed to initialize background task manager (native module missing):', e.message);
}
