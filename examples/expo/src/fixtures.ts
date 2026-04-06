import type { ManualStepKey, ManualTestFormState } from './types'

export const DEFAULT_BUDGETS: Record<ManualStepKey, string> = {
  solveDiscreteLog: '250',
  batchRangeProof: '1500',
  batchVerifyProof: '750',
}

export function createDefaultManualTestForm(): ManualTestFormState {
  return {
    solverPointHex: 'e00af9c74d9edb8ebcc160ceec97d531cbd6e2956f9e9162b8e9eda260e82e43',
    solverMaxNumBits: '16',
    expectedSolveValue: '42',
    valBaseHex: 'e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76',
    randBaseHex: '8c9240b456a9e6dc65c377a1048d745f94a08cdb7f44cbcd7b46f34048871134',
    batchValuesCsv: '1, 2',
    batchBlindingsFlatHex:
      '09090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909090909',
    batchNumBits: '16',
    expectedBatchProofBytes: '608',
    expectedBatchCommsFlatHex:
      '761954bce2b8355c84daae57fcfab355b45c74dec69a9bb9847a93a9fcbd0c35fa76df206c370ad9663d6cc1b54e74815bfc01371ea0e53b7952a7fd02a9106a',
    expectedBatchCount: '2',
    budgets: { ...DEFAULT_BUDGETS },
  }
}
