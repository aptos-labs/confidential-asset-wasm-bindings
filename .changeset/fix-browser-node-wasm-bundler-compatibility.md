---
"@aptos-labs/confidential-asset-bindings": patch
---

fix: resolve node:fs bundler errors in browser environments by providing a dedicated browser build via the `browser` export condition

Bundlers (webpack, Vite, Turbopack) statically analyse dynamic imports regardless of runtime guards. The `node:fs` import in the shared WASM loader was being pulled into browser bundles, causing build-time or runtime errors.

The fix introduces a proper source split:

- `src/web/shared.ts` — WASM API factory with no environment-specific code
- `src/web/index.node.ts` — Node.js entry: resolves WASM from local `node_modules` via `node:fs`, falls back to CDN
- `src/web/index.browser.ts` — Browser entry: unconditionally uses CDN URL; zero `node:fs` references

The `browser` export condition in `package.json` routes all bundler targets to `index.browser.mjs`, so no bundler-specific magic comments are needed.

