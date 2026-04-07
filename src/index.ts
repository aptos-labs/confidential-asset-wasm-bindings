import init, {
  batch_range_proof,
  batch_verify_proof,
  DiscreteLogSolver,
} from '../build/wasm/aptos_confidential_asset_wasm';

import pkg from '../package.json';

export type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
} from './types';

import type {
  BatchRangeProofInputs,
  BatchRangeProofResult,
  BatchVerifyRangeProofInputs,
} from './types';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

async function getNodeModulesWASM(): Promise<string | BufferSource> {
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

async function getWasmSource(): Promise<string | BufferSource> {
  if (typeof process !== 'undefined' && process.versions?.node) {
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

/**
 * Generates a batch Bulletproofs range proof for a set of values.
 *
 * Proves that each value in `inputs.v` lies within `[0, 2^numBits)` without
 * revealing the values themselves. WASM is initialized automatically on first
 * call.
 *
 * @param inputs - Values, blinding factors, base points, and optional bit width.
 * @returns The serialized proof and the corresponding Pedersen commitments.
 *
 * @example
 * const { proof, comms } = await batchRangeProof({
 *   v: [100n, 200n],
 *   rs: [blindingFactor1, blindingFactor2],
 *   valBase,
 *   randBase,
 * });
 */
export const batchRangeProof = async (
  inputs: BatchRangeProofInputs,
): Promise<BatchRangeProofResult> => {
  await ensureWasmInitialized();

  const { v, rs, valBase, randBase, numBits = 32 } = inputs;

  const result = batch_range_proof(
    new BigUint64Array(v),
    rs,
    valBase,
    randBase,
    numBits,
  );

  try {
    return {
      proof: result.proof(),
      comms: result.comms(),
    };
  } finally {
    result.free();
  }
};

/**
 * Verifies a batch Bulletproofs range proof.
 *
 * Checks that the proof is valid for the given commitments and base points.
 * WASM is initialized automatically on first call.
 *
 * @param inputs - Proof bytes, commitments, base points, and optional bit width.
 * @returns `true` if the proof is valid, `false` otherwise.
 *
 * @example
 * const valid = await batchVerifyProof({ proof, comms, valBase, randBase });
 */
export const batchVerifyProof = async (
  inputs: BatchVerifyRangeProofInputs,
): Promise<boolean> => {
  await ensureWasmInitialized();

  const { proof, comms, valBase, randBase, numBits = 32 } = inputs;

  return batch_verify_proof(proof, comms, valBase, randBase, numBits);
};

let _discreteLogSolver: DiscreteLogSolver | null = null;

const getDiscreteLogSolver = () => {
  if (!_discreteLogSolver) {
    _discreteLogSolver = new DiscreteLogSolver();
  }
  return _discreteLogSolver;
};

/**
 * Solves the discrete logarithm for a compressed Ristretto point.
 *
 * Given a point `y = n * G`, returns `n` by exhaustive search up to
 * `2^maxNumBits`. WASM is initialized automatically on first call. The
 * internal solver is lazily created and reused across calls.
 *
 * @param y - Compressed Ristretto point (32 bytes).
 * @param maxNumBits - Search space upper bound as a bit width. Must be 16 or 32.
 * @returns The discrete logarithm `n` such that `n * G == y`.
 * @throws If no solution exists within the search space.
 *
 * @example
 * const n = await solveDiscreteLog(pointBytes, 16);
 */
export const solveDiscreteLog = async (
  y: Uint8Array,
  maxNumBits: number,
): Promise<bigint> => {
  await ensureWasmInitialized();
  const solver = getDiscreteLogSolver();
  return solver.solve(y, maxNumBits);
};
