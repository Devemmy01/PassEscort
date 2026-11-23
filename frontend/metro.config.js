// Learn more https://docs.expo.dev/guides/customizing-metro
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Rules and API types shared with the backend live in ../shared (pure TS, no dependencies).
config.watchFolders = [...(config.watchFolders ?? []), path.resolve(__dirname, '../shared')];

// expo-sqlite on web (docs.expo.dev/versions/v57.0.0/sdk/sqlite, "Web setup"):
// bundle its wa-sqlite .wasm, and send the COEP/COOP headers it needs for
// SharedArrayBuffer. Static web hosting must send the same two headers.
config.resolver.assetExts.push('wasm');
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
