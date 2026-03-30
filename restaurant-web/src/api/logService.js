// Memory log storage for diagnostics
const MAX_LOGS = 50;
let logs = [];
let listeners = [];

export const logService = {
  addLog: (entry) => {
    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      ...entry
    };
    logs = [logEntry, ...logs].slice(0, MAX_LOGS);
    listeners.forEach(listener => listener(logs));
  },
  getLogs: () => logs,
  clearLogs: () => {
    logs = [];
    listeners.forEach(listener => listener(logs));
  },
  subscribe: (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }
};
