import pkg from '../../package.json';
import { createWasmApi } from './shared';

export type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
} from '../types';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

async function getWasmSource(): Promise<string | BufferSource> {
  return CDN_WASM_URL;
}

export const { batchRangeProof, batchVerifyProof, solveDiscreteLog } =
  createWasmApi(getWasmSource);
