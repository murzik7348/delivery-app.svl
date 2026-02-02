const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Цей рядок вмикає ту саму функцію require.context
config.transformer.unstable_allowRequireContext = true;

module.exports = config;