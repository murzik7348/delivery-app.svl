const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && moduleName === 'react-native-maps') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(__dirname, 'utils/react-native-maps-stub.js'),
    };
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;


