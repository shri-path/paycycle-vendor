/**
 * Babel configuration
 *
 * NOTE: This file MUST stay CommonJS (`module.exports`), not ESM
 * (`export default` / `babel.config.mjs`). Metro loads the Babel config
 * synchronously via `loadPartialConfigSync`, and Babel only supports native
 * ESM config files when loaded asynchronously. An ESM config throws at bundle
 * time: "You appear to be using a native ECMAScript module configuration file,
 * which is only supported when running Babel asynchronously." Likewise, do NOT
 * add `"type": "module"` to package.json.
 *
 * babel-preset-expo applies the Expo/React Native transforms, including:
 * - import-meta-transform-plugin (rewrites `import.meta` for the web bundle —
 *   zustand's ESM build uses it, which otherwise crashes web with
 *   "Cannot use 'import.meta' outside a module")
 * - react-native-worklets/reanimated plugin
 * - React Compiler (enabled via app.json experiments.reactCompiler)
 */
module.exports = function (api) {
  api.cache(true)
  return {
    // unstable_transformImportMeta polyfills `import.meta` in the web client bundle
    // (off by default for the browser). zustand's ESM build uses it, which otherwise
    // throws "Cannot use 'import.meta' outside a module" on web.
    presets: [['babel-preset-expo', { web: { unstable_transformImportMeta: true } }]],
  }
}
