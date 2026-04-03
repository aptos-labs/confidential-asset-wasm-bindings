import init, {
  DiscreteLogSolver,
  range_proof,
  batch_range_proof,
  verify_proof,
  batch_verify_proof,
} from '../build/wasm/aptos_confidential_asset_wasm';

import pkg from '../package.json';

const CDN_WASM_URL = `https://unpkg.com/@aptos-labs/confidential-asset-bindings@${pkg.version}/dist/aptos_confidential_asset_wasm_bg.wasm`;

let initPromise: Promise<void> | undefined;
let initialized = false;

export async function ensureWasmInitialized(): Promise<void> {
  if (initialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        await init({ module_or_path: CDN_WASM_URL });
        initialized = true;
      } catch (error) {
        initPromise = undefined;
        throw error;
      }
    })();
  }
  await initPromise;
}

export interface RangeProofInputs {
  v: bigint;
  r: Uint8Array;
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}

export const rangeProof = async (inputs: RangeProofInputs) => {
  await ensureWasmInitialized();

  const { v, r, valBase, randBase, numBits = 32 } = inputs;

  const proof = range_proof(v, r, valBase, randBase, numBits);

  try {
    return {
      proof: proof.proof(),
      commitment: proof.comm(),
    }
  } finally {
    proof.free();
  }
}

export interface BatchRangeProofInputs {
  v: bigint[];
  rs: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}

export const batchRangeProof = async (inputs: BatchRangeProofInputs) => {
  await ensureWasmInitialized();

  const { v, rs, valBase, randBase, numBits = 32 } = inputs;

  const proof = batch_range_proof(new BigUint64Array(v), rs, valBase, randBase, numBits);

  try {
    return {
      proof: proof.proof(),
      commitments: proof.comms(),
    }
  } finally {
    proof.free();
  }
}

export interface VerifyRangeProofInputs {
  proof: Uint8Array;
  comm: Uint8Array;
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}

export const verifyProof = async (inputs: VerifyRangeProofInputs) => {
  await ensureWasmInitialized();

  const { proof, comm, valBase, randBase, numBits = 32 } = inputs;

  return verify_proof(proof, comm, valBase, randBase, numBits);
}

export interface BatchVerifyRangeProofInputs {
  proof: Uint8Array;
  comms: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits: number;
}

export const batchVerifyProof = async (inputs: BatchVerifyRangeProofInputs) => {
  await ensureWasmInitialized();

  const { proof, comms, valBase, randBase, numBits } = inputs;

  return batch_verify_proof(proof, comms, valBase, randBase, numBits);
}

let _discreteLogSolver: DiscreteLogSolver | null = null;

const getDiscreteLogSolver = () => {
  if (_discreteLogSolver) return _discreteLogSolver;

  return _discreteLogSolver = new DiscreteLogSolver();
}

export const solveDiscreteLog = async (y: Uint8Array, maxNumBits: number) => {
  await ensureWasmInitialized();

  const solver = getDiscreteLogSolver();

  return solver.solve(y, maxNumBits);
}
