const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Watch monorepo root for shared source packages
config.watchFolders = [monorepoRoot];

// Resolve from mobile's node_modules first, then monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(monorepoRoot, 'node_modules'),
];

// Force react and react-native to resolve from mobile's local copy ONLY.
// This prevents loading two different React runtimes in the same bundle.
const mobileModules = path.resolve(projectRoot, 'node_modules');

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Pin these critical packages to mobile's local copy
  if (
    moduleName === 'react' ||
    moduleName === 'react-dom' ||
    moduleName === 'react-native' ||
    moduleName === 'react-native-web' ||
    moduleName === 'react/jsx-runtime' ||
    moduleName === 'react/jsx-dev-runtime' ||
    moduleName.startsWith('react-native/')
  ) {
    try {
      const resolved = require.resolve(moduleName, { paths: [mobileModules] });
      return { type: 'sourceFile', filePath: resolved };
    } catch {
      // Fall through to default
    }
  }

  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
