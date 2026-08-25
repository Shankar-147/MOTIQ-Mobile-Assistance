// Metro-only shim — `apps/mobile` never runs on a web/DOM target, so the
// real `react-dom` package is never actually needed here. It's pulled in
// transitively by @gluestack-ui/themed -> @gluestack-ui/overlay ->
// @react-native-aria/interactions -> @react-aria/utils's animation helper
// (node_modules/react-aria/dist/private/utils/animation.cjs), which
// unconditionally `require("react-dom")` at module load time even though
// the code path that calls `flushSync` only runs when `ref.current` is a
// real DOM node with a `getAnimations()` method — never true for a React
// Native ref, so `flushSync` here is dead code on this platform, not a
// silently-broken feature. Metro still needs the module to resolve and
// `require()` cleanly, hence this stub instead of installing the real
// (DOM-dependent, much heavier) package. See metro.config.js's resolver
// alias and docs/roadmap.md for the full story.
module.exports = {
  flushSync(callback) {
    callback();
  },
};
