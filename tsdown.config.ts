import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: "src/index.ts",
  format: ["cjs", "esm"],
  copy: ['build/wasm/aptos_confidential_asset_wasm_bg.wasm'],
});
