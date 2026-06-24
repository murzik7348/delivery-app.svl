const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const { resolve } = require('metro-resolver');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const targetPlatform = platform || context.platform;
  
  if (moduleName === 'react-native-maps') {
    if (targetPlatform === 'web') {
      return {
        type: 'sourceFile',
        filePath: path.resolve(__dirname, 'utils/react-native-maps-stub.js'),
      };
    }
  }

  // Clear resolveRequest in the context clone to prevent recursion loop
  return resolve(
    {
      ...context,
      resolveRequest: undefined,
    },
    moduleName,
    platform
  );
};

module.exports = config;


