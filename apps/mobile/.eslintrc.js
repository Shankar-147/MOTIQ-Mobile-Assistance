module.exports = {
  extends: [require.resolve("@motiq/config/eslint-preset.js")],
  parserOptions: {
    project: "./tsconfig.json",
  },
  env: {
    node: false,
  },
};
