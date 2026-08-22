// ESLint 8's shareable-config naming convention mangles scoped subpaths
// (e.g. "@motiq/config/eslint-preset.js" -> "@motiq/eslint-config-config/...")
// so this resolves the absolute path directly instead of relying on it.
module.exports = {
  extends: [require.resolve("@motiq/config/eslint-preset.js")],
  parserOptions: {
    project: "./tsconfig.json",
  },
};
