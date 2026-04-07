/**
 * Inputs for generating a batch range proof.
 */
export interface BatchRangeProofInputs {
  /** Values to prove are within range. Each must be an unsigned 64-bit integer. */
  v: bigint[];
  /** Blinding factors for each value. Each must be exactly 32 bytes. Must have the same length as `v`. */
  rs: Uint8Array[];
  /** Value base point for Pedersen commitments (32 bytes). */
  valBase: Uint8Array;
  /** Randomness base point for Pedersen commitments (32 bytes). */
  randBase: Uint8Array;
  /** Number of bits for the range proof. Must be 8, 16, 32, or 64. Defaults to 32. */
  numBits?: number;
}

/**
 * Result of a batch range proof generation.
 */
export interface BatchRangeProofResult {
  /** Serialized range proof bytes. */
  proof: Uint8Array;
  /** Pedersen commitments, one per value. Each is exactly 32 bytes. */
  comms: Uint8Array[];
}

/**
 * Inputs for verifying a batch range proof.
 */
export interface BatchVerifyRangeProofInputs {
  /** Serialized range proof bytes to verify. */
  proof: Uint8Array;
  /** Pedersen commitments to verify against. Each must be exactly 32 bytes. */
  comms: Uint8Array[];
  /** Value base point for Pedersen commitments (32 bytes). Must match the one used during proof generation. */
  valBase: Uint8Array;
  /** Randomness base point for Pedersen commitments (32 bytes). Must match the one used during proof generation. */
  randBase: Uint8Array;
  /** Number of bits for the range proof. Must be 8, 16, 32, or 64. Defaults to 32. */
  numBits?: number;
}
