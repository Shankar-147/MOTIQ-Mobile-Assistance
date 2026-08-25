// Expo's official monorepo config (https://docs.expo.dev/guides/monorepos/) —
// needed because npm workspaces hoists shared dependencies (react, react-native,
// expo itself) to the repo root's node_modules, not this package's own.
const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// @gluestack-ui/themed -> @gluestack-ui/overlay -> @react-native-aria/interactions
// -> @react-aria/utils's animation helper unconditionally `require("react-dom")`,
// which doesn't exist for a React Native/Metro bundle and fails the whole build
// ("Unable to resolve 'react-dom'"). The code path that actually calls it only
// runs against a real DOM node (`'getAnimations' in ref.current`), which is never
// true for a React Native ref — dead code on this platform, safe to stub. See
// shims/react-dom.js and docs/roadmap.md for the full explanation.
config.resolver.extraNodeModules = {
  ...config.resolver.extraNodeModules,
  "react-dom": path.resolve(projectRoot, "shims/react-dom.js"),
};

module.exports = config;
