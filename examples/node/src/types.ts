export const MANUAL_STEP_KEYS = [
  'solveDiscreteLog',
  'batchRangeProof',
  'batchVerifyProof',
] as const

export type ManualStepKey = (typeof MANUAL_STEP_KEYS)[number]

export const MANUAL_STEP_LABELS: Record<ManualStepKey, string> = {
  solveDiscreteLog: 'solveDiscreteLog',
  batchRangeProof: 'batchRangeProof',
  batchVerifyProof: 'batchVerifyProof',
}

export type ManualStepStatus = 'pass' | 'warn' | 'fail'

export type ManualTestFormState = {
  solverPointHex: string;
  solverMaxNumBits: string;
  expectedSolveValue: string;
  valBaseHex: string;
  randBaseHex: string;
  batchValuesCsv: string;
  batchBlindingsFlatHex: string;
  batchNumBits: string;
  expectedBatchProofBytes: string;
  expectedBatchCommsFlatHex: string;
  expectedBatchCount: string;
  budgets: Record<ManualStepKey, string>;
}

export type ManualValidationErrors = Partial<Record<string, string>>

export type PreparedManualTestInput = {
  solver: {
    point: Uint8Array;
    maxNumBits: number;
    expectedSolveValue: string;
  };
  common: {
    valBase: Uint8Array;
    randBase: Uint8Array;
  };
  batch: {
    values: string[];
    blindingsFlat: Uint8Array;
    valueCount: number;
    numBits: number;
    expectedProofBytes: number;
    expectedCommsFlatHex: string;
    expectedCount: number;
  };
  budgets: Record<ManualStepKey, number>;
}

export type ManualRuntimeState = {
  batchProof: Uint8Array | null;
  batchCommsFlat: Uint8Array | null;
  batchCount: number | null;
}

export type ManualDerivedOutputs = {
  batchProofHex: string;
  batchCommsFlatHex: string;
  batchCount: string;
}

export type ManualStepResult = {
  key: ManualStepKey;
  label: string;
  status: ManualStepStatus;
  durationMs: number;
  summary: string;
  assertion: string;
}

export type ManualTestRunResult = {
  results: ManualStepResult[];
  runtimeState: ManualRuntimeState;
  derivedOutputs: ManualDerivedOutputs;
}

export type ManualStepRunResult = {
  result: ManualStepResult;
  runtimeState: ManualRuntimeState;
  derivedOutputs: ManualDerivedOutputs;
}

export function createEmptyRuntimeState(): ManualRuntimeState {
  return {
    batchProof: null,
    batchCommsFlat: null,
    batchCount: null,
  }
}

export function createEmptyDerivedOutputs(): ManualDerivedOutputs {
  return {
    batchProofHex: '',
    batchCommsFlatHex: '',
    batchCount: '',
  }
}
