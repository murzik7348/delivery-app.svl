const originalConsoleError = console.error;
console.error = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('react-test-renderer is deprecated')) {
    return;
  }
  originalConsoleError(...args);
};
