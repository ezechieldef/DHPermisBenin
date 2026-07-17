const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);
config.resolver.assetExts.push('sqlite', 'db', 'wasm');
module.exports = withNativeWind(config, { input: './global.css' });
