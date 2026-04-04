export {
  DiscreteLogSolver,
  SingleRangeProof,
  BatchRangeProof,
  range_proof,
  batch_range_proof,
  verify_proof,
  batch_verify_proof,
} from '../build/wasm/web/aptos_confidential_asset_wasm';

import init from '../build/wasm/web/aptos_confidential_asset_wasm'

import pkg from '../package.json';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

let initPromise: Promise<void> | undefined;
let initialized = false;

export async function initializeWasm(wasmSource?: string | BufferSource): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await init({ module_or_path: wasmSource ?? CDN_WASM_URL });
        initialized = true;
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }
  await initPromise;
}

export function isWasmInitialized(): boolean {
  return initialized;
}

export async function ensureWasmInitialized(): Promise<void> {
  if (!initialized) await initializeWasm();
}
