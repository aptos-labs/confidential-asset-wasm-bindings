import pkg from '../../package.json';
import { createWasmApi } from './shared';

export type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
} from '../types';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

async function getWasmSource(): Promise<string | BufferSource> {
  try {
    const fs = await import('node:fs');
    const path = await import('node:path');

    const possiblePaths = [
      path.resolve(
        process.cwd(),
        'node_modules/@aptos-labs/confidential-asset-bindings/dist/aptos_confidential_asset_wasm_bg.wasm',
      ),
      new URL('./aptos_confidential_asset_wasm_bg.wasm', import.meta.url)
        .pathname,
    ];

    for (const wasmPath of possiblePaths) {
      if (fs.existsSync(wasmPath)) {
        return fs.readFileSync(wasmPath);
      }
    }
  } catch {
    // Fall through to URL
  }
  return CDN_WASM_URL;
}

export const { batchRangeProof, batchVerifyProof, solveDiscreteLog } =
  createWasmApi(getWasmSource);
