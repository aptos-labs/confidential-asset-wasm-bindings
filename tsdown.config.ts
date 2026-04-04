import { defineConfig, type UserConfig } from 'tsdown';

const BROWSER_CONFIG: UserConfig = {
  entry: { "index.browser": "src/index.browser.ts" },
  format: "esm",
  platform: "browser",
};

const NODE_CONFIG: UserConfig = {
  entry: { "index.node": "src/index.node.ts" },
  format: ["cjs", "esm"],
  platform: "node",
  copy: ['build/wasm/nodejs/aptos_confidential_asset_wasm_bg.wasm'],
};

export default defineConfig([BROWSER_CONFIG, NODE_CONFIG]);
