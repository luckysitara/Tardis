// metro.config.js
const {getDefaultConfig} = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// Explicitly define nodeModulesPaths to ensure Metro only looks within this project's node_modules
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

// Prevent Metro from crawling outside the project root
config.watchFolders = [__dirname]; // Keep watching only current project folder

config.transformer = {
  ...config.transformer,
  babelTransformerPath: require.resolve('react-native-svg-transformer'),
};

config.resolver = {
  ...config.resolver,
  assetExts: config.resolver.assetExts.filter(ext => ext !== 'svg'),
  sourceExts: [...config.resolver.sourceExts, 'svg', 'mjs', 'cjs'], // Add mjs and cjs for web3.js compatibility
  extraNodeModules: {
    // Node.js core module polyfills - explicitly pointing to node_modules path
    crypto: path.join(__dirname, 'node_modules', 'expo-crypto'),
    fs: path.join(__dirname, './src/shared/utils/fsPolyfill.js'), // Custom polyfill
    'text-encoding': path.join(__dirname, 'node_modules', 'text-encoding'),
    stream: path.join(__dirname, 'node_modules', 'stream-browserify'),
    'web-streams-polyfill': path.join(__dirname, 'node_modules', 'web-streams-polyfill'),
    events: path.join(__dirname, 'node_modules', 'events'),
    
    // Additional polyfills for web3.js and related libraries
    buffer: path.join(__dirname, 'node_modules', 'buffer'),
    process: path.join(__dirname, 'node_modules', 'process'),
    assert: path.join(__dirname, 'node_modules', 'assert'),
    http: path.join(__dirname, 'node_modules', 'stream-http'),
    https: path.join(__dirname, 'node_modules', 'https-browserify'),
    os: path.join(__dirname, 'node_modules', 'os-browserify'),
    url: path.join(__dirname, 'node_modules', 'url'),
    vm: path.join(__dirname, 'node_modules', 'vm-browserify'),
    util: path.join(__dirname, 'node_modules', 'util'),
    
    // Explicit polyfill for rpc-websockets (based on previous error)
    'rpc-websockets': path.join(__dirname, 'node_modules', 'rpc-websockets'), 
  },
};

module.exports = config;