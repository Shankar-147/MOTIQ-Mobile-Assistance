module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    // react-stately (a gluestack-ui/@react-aria transitive dependency)
    // ships a .mjs file using static class blocks (Color.mjs). Metro's
    // node_modules transform doesn't enable that syntax plugin by default
    // via babel-preset-expo, causing "Static class blocks are not enabled"
    // at bundle time. Harmless to enable app-wide.
    plugins: ["@babel/plugin-transform-class-static-block"],
  };
};
