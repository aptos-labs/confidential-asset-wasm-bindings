export interface BatchRangeProofInputs {
  v: bigint[];
  rs: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}

export interface BatchRangeProofResult {
  proof: Uint8Array;
  comms: Uint8Array[];
}

export interface BatchVerifyRangeProofInputs {
  proof: Uint8Array;
  comms: Uint8Array[];
  valBase: Uint8Array;
  randBase: Uint8Array;
  numBits?: number;
}

export interface SolveDiscreteLogInputs {
  y: Uint8Array;
  maxNumBits: number;
}
