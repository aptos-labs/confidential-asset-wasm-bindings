import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: 'build/wasm/web/aptos_confidential_asset_wasm.js',
  copy: ['build/wasm/web/aptos_confidential_asset_wasm*'],
  format: 'cjs',
  clean: true,
});