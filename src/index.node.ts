export {
  DiscreteLogSolver,
  SingleRangeProof,
  BatchRangeProof,
  range_proof,
  batch_range_proof,
  verify_proof,
  batch_verify_proof,
} from '../build/wasm/nodejs/aptos_confidential_asset_wasm.js';

let initialized = true; // nodejs target loads WASM synchronously on import

export async function initializeWasm(_wasmSource?: string | BufferSource): Promise<void> {
  // no-op: nodejs target loads synchronously on import
}

export function isWasmInitialized(): boolean {
  return initialized;
}

export async function ensureWasmInitialized(): Promise<void> {
  if (!initialized) await initializeWasm();
}
