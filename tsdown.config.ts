import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: { 'index.node': 'src/web/index.node.ts' },
    format: ['cjs', 'esm'],
    copy: ['build/wasm/aptos_confidential_asset_wasm_bg.wasm'],
  },
  {
    entry: { 'index.browser': 'src/web/index.browser.ts' },
    format: ['esm'],
  },
]);
