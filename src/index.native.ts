import ConfidentialAssetBindingsModule from './ConfidentialAssetBindingsModule';

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

const RANGE_PROOF_NUM_BITS = new Set([8, 16, 32, 64]);
const DISCRETE_LOG_MAX_NUM_BITS = new Set([16, 32]);
const BATCH_ELEMENT_BYTES = 32;
const U64_BYTES = 8;
const U64_MAX = (1n << 64n) - 1n;

function assertRangeProofNumBits(numBits: number): void {
  if (!Number.isInteger(numBits) || !RANGE_PROOF_NUM_BITS.has(numBits)) {
    throw new Error(
      `numBits must be one of 8, 16, 32, or 64. Received ${numBits}.`,
    );
  }
}

function assertFixedWidthBatch(
  items: Uint8Array[],
  expectedBytes: number,
  label: string,
): void {
  for (const [index, item] of items.entries()) {
    if (item.length !== expectedBytes) {
      throw new Error(
        `${label}[${index}] must be exactly ${expectedBytes} bytes. Received ${item.length}.`,
      );
    }
  }
}

function assertUint64(value: bigint, label: string): void {
  if (value < 0n || value > U64_MAX) {
    throw new Error(
      `${label} must be an unsigned 64-bit integer. Received ${value.toString()}.`,
    );
  }
}

function assertDiscreteLogMaxNumBits(maxNumBits: number): void {
  if (
    !Number.isInteger(maxNumBits) ||
    !DISCRETE_LOG_MAX_NUM_BITS.has(maxNumBits)
  ) {
    throw new Error(
      `maxNumBits must be one of 16 or 32. Received ${maxNumBits}.`,
    );
  }
}

function packU64Values(values: bigint[]): Uint8Array {
  const valuesFlat = new Uint8Array(values.length * U64_BYTES);

  values.forEach((value, index) => {
    assertUint64(value, `v[${index}]`);

    let remaining = value;
    const offset = index * U64_BYTES;
    for (let byteIndex = 0; byteIndex < U64_BYTES; byteIndex++) {
      valuesFlat[offset + byteIndex] = Number(remaining & 0xffn);
      remaining >>= 8n;
    }
  });

  return valuesFlat;
}

/**
 * Generates a batch Bulletproofs range proof for a set of values.
 *
 * Proves that each value in `inputs.v` lies within `[0, 2^numBits)` without
 * revealing the values themselves. Delegates to the native JSI module.
 *
 * @param inputs - Values, blinding factors, base points, and optional bit width.
 * @returns The serialized proof and the corresponding Pedersen commitments.
 * @throws If `numBits` is not 8, 16, 32, or 64.
 * @throws If `rs.length !== v.length` or any blinding factor is not 32 bytes.
 * @throws If any value is outside the unsigned 64-bit integer range.
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
  const { v, rs, valBase, randBase, numBits = 32 } = inputs;
  assertRangeProofNumBits(numBits);

  if (rs.length !== v.length) {
    throw new Error(
      `rs must contain exactly one blinding per value. Received ${rs.length} blindings for ${v.length} values.`,
    );
  }
  assertFixedWidthBatch(rs, BATCH_ELEMENT_BYTES, 'rs');

  const valuesFlat = packU64Values(v);
  const blindingsFlat = new Uint8Array(
    rs.reduce((acc, r) => acc + r.length, 0),
  );
  let offset = 0;
  for (const r of rs) {
    blindingsFlat.set(r, offset);
    offset += r.length;
  }

  const result = await ConfidentialAssetBindingsModule.batchRangeProof(
    valuesFlat,
    blindingsFlat,
    v.length,
    valBase,
    randBase,
    numBits,
  );

  if (result.commsFlat.length !== result.count * BATCH_ELEMENT_BYTES) {
    throw new Error(
      `Native batchRangeProof returned ${result.commsFlat.length} commitment bytes for ${result.count} commitments.`,
    );
  }

  const comms: Uint8Array[] = [];
  for (let i = 0; i < result.count; i++) {
    comms.push(
      result.commsFlat.slice(
        i * BATCH_ELEMENT_BYTES,
        (i + 1) * BATCH_ELEMENT_BYTES,
      ),
    );
  }

  return { proof: result.proof, comms };
};

/**
 * Verifies a batch Bulletproofs range proof.
 *
 * Checks that the proof is valid for the given commitments and base points.
 * Delegates to the native JSI module.
 *
 * @param inputs - Proof bytes, commitments, base points, and optional bit width.
 * @returns `true` if the proof is valid, `false` otherwise.
 * @throws If `numBits` is not 8, 16, 32, or 64.
 * @throws If any commitment is not exactly 32 bytes.
 *
 * @example
 * const valid = await batchVerifyProof({ proof, comms, valBase, randBase });
 */
export const batchVerifyProof = async (
  inputs: BatchVerifyRangeProofInputs,
): Promise<boolean> => {
  const { proof, comms, valBase, randBase, numBits = 32 } = inputs;
  assertRangeProofNumBits(numBits);
  assertFixedWidthBatch(comms, BATCH_ELEMENT_BYTES, 'comms');

  const commsFlat = new Uint8Array(comms.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const c of comms) {
    commsFlat.set(c, offset);
    offset += c.length;
  }

  return ConfidentialAssetBindingsModule.batchVerifyProof(
    proof,
    commsFlat,
    comms.length,
    valBase,
    randBase,
    numBits,
  );
};

let _solverHandle: Promise<number> | null = null;

const getSolverHandle = () => {
  if (!_solverHandle) {
    _solverHandle = ConfidentialAssetBindingsModule.createSolver().catch(
      (error) => {
        _solverHandle = null;
        throw error;
      },
    );
  }
  return _solverHandle;
};

/**
 * Solves the discrete logarithm for a compressed Ristretto point.
 *
 * Given a point `y = n * G`, returns `n` by exhaustive search up to
 * `2^maxNumBits`. The internal solver is lazily created and reused across
 * calls. Delegates to the native JSI module.
 *
 * @param y - Compressed Ristretto point (32 bytes).
 * @param maxNumBits - Search space upper bound as a bit width. Must be 16 or 32.
 * @returns The discrete logarithm `n` such that `n * G == y`.
 * @throws If `maxNumBits` is not 16 or 32.
 * @throws If no solution exists within the search space.
 *
 * @example
 * const n = await solveDiscreteLog(pointBytes, 16);
 */
export const solveDiscreteLog = async (
  y: Uint8Array,
  maxNumBits: number,
): Promise<bigint> => {
  assertDiscreteLogMaxNumBits(maxNumBits);

  const handle = await getSolverHandle();
  const result = await ConfidentialAssetBindingsModule.solverSolve(
    handle,
    y,
    maxNumBits,
  );
  return BigInt(result);
};
