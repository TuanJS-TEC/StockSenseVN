// mobile/ is outside the npm workspaces (it pins its own React Native and React versions),
// so Metro is told where the shared packages/core lives (SDD 8.3).
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
config.watchFolders = [path.resolve(__dirname, '../packages/core')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
