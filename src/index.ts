import init, {
  DiscreteLogSolver,
  batch_range_proof,
  batch_verify_proof,
} from '../build/wasm/aptos_confidential_asset_wasm';

import pkg from '../package.json';

export type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
  SolveDiscreteLogInputs,
} from './types';

import type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
} from './types';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

async function getNodeModulesWASM(): Promise<string | BufferSource> {
  try {
    const fs = await import("fs");
    const path = await import("path");

    const possiblePaths = [
      path.resolve(
          process.cwd(),
          "node_modules/@aptos-labs/confidential-asset-bindings/dist/aptos_confidential_asset_wasm_bg.wasm",
      ),
      new URL("./aptos_confidential_asset_wasm_bg.wasm", import.meta.url).pathname,
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

async function getWasmSource(): Promise<string | BufferSource> {
  if (typeof process !== "undefined" && process.versions?.node) {
    return getNodeModulesWASM();
  }
  return CDN_WASM_URL;
}

let initPromise: Promise<void> | undefined;
let initialized = false;

async function ensureWasmInitialized(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const moduleOrPath = await getWasmSource();
        await init({ module_or_path: moduleOrPath });
        initialized = true;
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }
  await initPromise;
}

export const batchRangeProof = async (inputs: BatchRangeProofInputs): Promise<BatchRangeProofResult> => {
  await ensureWasmInitialized();

  const { v, rs, valBase, randBase, numBits = 32 } = inputs;

  const result = batch_range_proof(new BigUint64Array(v), rs, valBase, randBase, numBits);

  try {
    return {
      proof: result.proof(),
      comms: result.comms(),
    };
  } finally {
    result.free();
  }
};

export const batchVerifyProof = async (inputs: BatchVerifyRangeProofInputs): Promise<boolean> => {
  await ensureWasmInitialized();

  const { proof, comms, valBase, randBase, numBits = 32 } = inputs;

  return batch_verify_proof(proof, comms, valBase, randBase, numBits);
};

let _discreteLogSolver: DiscreteLogSolver | null = null;

const getDiscreteLogSolver = () => {
  if (_discreteLogSolver) return _discreteLogSolver;
  return _discreteLogSolver = new DiscreteLogSolver();
};

export const solveDiscreteLog = async (y: Uint8Array, maxNumBits: number): Promise<bigint> => {
  await ensureWasmInitialized();
  const solver = getDiscreteLogSolver();
  return solver.solve(y, maxNumBits);
};
