const path = require('path');
const { getDefaultConfig, mergeConfig } = require('@react-native/metro-config');

/**
 * Metro configuration
 * https://reactnative.dev/docs/metro
 *
 * `whatwg-url-without-unicode` (Firestore dependency) uses `require("./utils.js")`.
 * Metro's resolver often fails to resolve that exact form; map it to the file on disk.
 *
 * @type {import('@react-native/metro-config').MetroConfig}
 */
const defaultConfig = getDefaultConfig(__dirname);

module.exports = mergeConfig(defaultConfig, {
  resolver: {
    resolveRequest(context, moduleName, platform) {
      if (
        typeof moduleName === 'string' &&
        moduleName.startsWith('./') &&
        moduleName.endsWith('.js') &&
        context.originModulePath &&
        context.originModulePath.includes('whatwg-url-without-unicode')
      ) {
        const filePath = path.join(
          path.dirname(context.originModulePath),
          moduleName.replace(/^\.\//, ''),
        );
        return { type: 'sourceFile', filePath };
      }
      return context.resolveRequest(context, moduleName, platform);
    },
  },
});
