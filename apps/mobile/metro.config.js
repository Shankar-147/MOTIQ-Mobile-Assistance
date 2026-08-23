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

module.exports = config;
