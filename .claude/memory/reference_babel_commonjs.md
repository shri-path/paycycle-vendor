---
name: Babel Config Must Stay CommonJS
description: babel.config.js must use module.exports (CommonJS) — native ESM breaks Metro's synchronous config loader
metadata:
  type: reference
---
`babel.config.js` MUST stay CommonJS (`module.exports`). Do NOT convert it to ESM (`export default` / `babel.config.mjs`) and do NOT add `"type": "module"` to `package.json`.

Metro loads the Babel config synchronously via `loadPartialConfigSync`. Babel only supports native ESM config files when loaded asynchronously, so an ESM config throws at bundle time:

> You appear to be using a native ECMAScript module configuration file, which is only supported when running Babel asynchronously.

This is a Metro/Babel toolchain constraint, not a project preference. Tooling config files (`babel.config.js`, `metro.config.js`, `jest.config.js`) being plain CommonJS `.js` is normal even in strict-TypeScript Expo projects — they run in Node before any transpilation. TS strict mode governs app source (`src/`, `app/`), not build tooling.
