const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Це змусить Metro правильно обробляти розширення
config.resolver.sourceExts = [...config.resolver.sourceExts, 'ts', 'tsx', 'js', 'jsx', 'json'];

module.exports = config;