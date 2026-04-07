import {
  batchRangeProof,
  batchVerifyProof,
  solveDiscreteLog,
} from '@aptos-labs/confidential-asset-bindings';
import {
  createEmptyRuntimeState,
  MANUAL_STEP_KEYS,
  MANUAL_STEP_LABELS,
  type ManualDerivedOutputs,
  type ManualRuntimeState,
  type ManualStepKey,
  type ManualStepResult,
  type ManualStepRunResult,
  type ManualTestFormState,
  type ManualTestRunResult,
  type ManualValidationErrors,
  type PreparedManualTestInput,
} from './types';
import {
  budgetFieldId,
  bytesToHex,
  hexToBytes,
  parseCsvU64,
  parseNonNegativeInteger,
  parsePositiveInteger,
  parseU64,
  summarizeValue,
} from './utils';

const ELEMENT_WIDTH = 32;

function splitFixedWidth(flat: Uint8Array, count: number): Uint8Array[] {
  return Array.from(
    { length: count },
    (_, i) =>
      new Uint8Array(flat.subarray(i * ELEMENT_WIDTH, (i + 1) * ELEMENT_WIDTH)),
  );
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  return 'Unknown error';
}

function defaultNow(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}

function cloneBytes(bytes: Uint8Array | null): Uint8Array | null {
  return bytes ? new Uint8Array(bytes) : null;
}

function cloneRuntimeState(
  runtimeState?: ManualRuntimeState,
): ManualRuntimeState {
  return {
    batchProof: cloneBytes(runtimeState?.batchProof ?? null),
    batchCommsFlat: cloneBytes(runtimeState?.batchCommsFlat ?? null),
    batchCount: runtimeState?.batchCount ?? null,
  };
}

export function runtimeStateToDerivedOutputs(
  runtimeState: ManualRuntimeState,
): ManualDerivedOutputs {
  return {
    batchProofHex: runtimeState.batchProof
      ? bytesToHex(runtimeState.batchProof)
      : '',
    batchCommsFlatHex: runtimeState.batchCommsFlat
      ? bytesToHex(runtimeState.batchCommsFlat)
      : '',
    batchCount:
      runtimeState.batchCount === null ? '' : String(runtimeState.batchCount),
  };
}

function pushSkippedResult(
  results: ManualStepResult[],
  key: ManualStepKey,
  reason: string,
) {
  results.push({
    key,
    label: MANUAL_STEP_LABELS[key],
    status: 'fail',
    durationMs: 0,
    summary: 'Unavailable',
    assertion: reason,
  });
}

function pushMeasuredResult(
  results: ManualStepResult[],
  key: ManualStepKey,
  durationMs: number,
  summary: string,
  assertion: string,
  passed: boolean,
  budgetMs: number,
) {
  results.push({
    key,
    label: MANUAL_STEP_LABELS[key],
    status: passed ? (durationMs > budgetMs ? 'warn' : 'pass') : 'fail',
    durationMs,
    summary,
    assertion,
  });
}

type PrepareResult = {
  errors: ManualValidationErrors;
  prepared?: PreparedManualTestInput;
};

export function prepareManualTestInput(
  form: ManualTestFormState,
): PrepareResult {
  const errors: ManualValidationErrors = {};

  function readField<T>(fieldId: string, action: () => T): T | null {
    try {
      return action();
    } catch (error) {
      errors[fieldId] = errorMessage(error);
      return null;
    }
  }

  const solverPoint = readField('solverPointHex', () =>
    hexToBytes('point', form.solverPointHex, 32),
  );
  const solverMaxNumBits = readField('solverMaxNumBits', () =>
    parsePositiveInteger('maxNumBits', form.solverMaxNumBits, { max: 255 }),
  );
  const expectedSolveValue = readField('expectedSolveValue', () =>
    parseU64('Expected solve value', form.expectedSolveValue),
  );
  const valBase = readField('valBaseHex', () =>
    hexToBytes('valBase', form.valBaseHex, 32),
  );
  const randBase = readField('randBaseHex', () =>
    hexToBytes('randBase', form.randBaseHex, 32),
  );
  const batchValues = readField('batchValuesCsv', () =>
    parseCsvU64('values', form.batchValuesCsv),
  );
  const batchBlindingsFlat = batchValues
    ? readField('batchBlindingsFlatHex', () =>
        hexToBytes(
          'blindingsFlat',
          form.batchBlindingsFlatHex,
          batchValues.length * 32,
        ),
      )
    : null;
  const batchNumBits = readField('batchNumBits', () =>
    parsePositiveInteger('numBits', form.batchNumBits, { max: 64 }),
  );
  const expectedBatchProofBytes = readField('expectedBatchProofBytes', () =>
    parsePositiveInteger(
      'Expected batch proof bytes',
      form.expectedBatchProofBytes,
    ),
  );
  const expectedBatchCount = readField('expectedBatchCount', () =>
    parsePositiveInteger(
      'Expected batch commitment count',
      form.expectedBatchCount,
    ),
  );
  const expectedBatchCommsFlat = expectedBatchCount
    ? readField('expectedBatchCommsFlatHex', () =>
        bytesToHex(
          hexToBytes(
            'Expected batch commitments',
            form.expectedBatchCommsFlatHex,
            expectedBatchCount * 32,
          ),
        ),
      )
    : null;

  const budgets = {} as PreparedManualTestInput['budgets'];
  for (const key of MANUAL_STEP_KEYS) {
    const budgetValue = readField(budgetFieldId(key), () =>
      parseNonNegativeInteger(
        `${MANUAL_STEP_LABELS[key]} budget`,
        form.budgets[key],
      ),
    );

    if (budgetValue !== null) {
      budgets[key] = budgetValue;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { errors };
  }

  return {
    errors,
    prepared: {
      solver: {
        point: solverPoint!,
        maxNumBits: solverMaxNumBits!,
        expectedSolveValue: expectedSolveValue!,
      },
      common: {
        valBase: valBase!,
        randBase: randBase!,
      },
      batch: {
        values: batchValues!,
        blindingsFlat: batchBlindingsFlat!,
        valueCount: batchValues!.length,
        numBits: batchNumBits!,
        expectedProofBytes: expectedBatchProofBytes!,
        expectedCommsFlatHex: expectedBatchCommsFlat!,
        expectedCount: expectedBatchCount!,
      },
      budgets,
    },
  };
}

async function measure<T>(
  now: () => number,
  action: () => Promise<T>,
): Promise<{ durationMs: number; value?: T; error?: unknown }> {
  const startedAt = now();

  try {
    const value = await action();
    return { durationMs: now() - startedAt, value };
  } catch (error) {
    return { durationMs: now() - startedAt, error };
  }
}

async function runStep(
  input: PreparedManualTestInput,
  key: ManualStepKey,
  runtimeState: ManualRuntimeState,
  results: ManualStepResult[],
  now: () => number,
): Promise<void> {
  switch (key) {
    case 'solveDiscreteLog': {
      const stepResult = await measure(now, () =>
        solveDiscreteLog(input.solver.point, input.solver.maxNumBits).then(
          (n) => n.toString(),
        ),
      );
      if (stepResult.error) {
        pushMeasuredResult(
          results,
          key,
          stepResult.durationMs,
          'No discrete log value returned',
          errorMessage(stepResult.error),
          false,
          input.budgets[key],
        );
        return;
      }

      const actual = stepResult.value!;
      pushMeasuredResult(
        results,
        key,
        stepResult.durationMs,
        actual,
        `Expected ${input.solver.expectedSolveValue}`,
        actual === input.solver.expectedSolveValue,
        input.budgets[key],
      );
      return;
    }

    case 'batchRangeProof': {
      const rs = splitFixedWidth(
        input.batch.blindingsFlat,
        input.batch.valueCount,
      );
      const stepResult = await measure(now, () =>
        batchRangeProof({
          v: input.batch.values.map(BigInt),
          rs,
          valBase: input.common.valBase,
          randBase: input.common.randBase,
          numBits: input.batch.numBits,
        }),
      );
      if (stepResult.error) {
        pushMeasuredResult(
          results,
          key,
          stepResult.durationMs,
          'No batch proof returned',
          errorMessage(stepResult.error),
          false,
          input.budgets[key],
        );
        return;
      }

      const { proof, comms } = stepResult.value!;
      const commsFlat = new Uint8Array(comms.length * ELEMENT_WIDTH);
      comms.forEach((c, i) => {
        commsFlat.set(c, i * ELEMENT_WIDTH);
      });

      runtimeState.batchProof = new Uint8Array(proof);
      runtimeState.batchCommsFlat = commsFlat;
      runtimeState.batchCount = comms.length;
      const batchCommsFlatHex = bytesToHex(commsFlat);
      const passed =
        proof.length === input.batch.expectedProofBytes &&
        batchCommsFlatHex === input.batch.expectedCommsFlatHex &&
        comms.length === input.batch.expectedCount;

      pushMeasuredResult(
        results,
        key,
        stepResult.durationMs,
        `count=${comms.length} proofBytes=${proof.length}`,
        `Expected count ${input.batch.expectedCount}, proofBytes ${input.batch.expectedProofBytes}, commitments ${summarizeValue(input.batch.expectedCommsFlatHex)}`,
        passed,
        input.budgets[key],
      );
      return;
    }

    case 'batchVerifyProof': {
      if (
        !runtimeState.batchProof ||
        !runtimeState.batchCommsFlat ||
        runtimeState.batchCount === null
      ) {
        pushSkippedResult(
          results,
          key,
          'batchVerifyProof requires batchRangeProof() output',
        );
        return;
      }

      const comms = splitFixedWidth(
        runtimeState.batchCommsFlat,
        runtimeState.batchCount,
      );
      const stepResult = await measure(now, () =>
        batchVerifyProof({
          proof: runtimeState.batchProof!,
          comms,
          valBase: input.common.valBase,
          randBase: input.common.randBase,
          numBits: input.batch.numBits,
        }),
      );
      if (stepResult.error) {
        pushMeasuredResult(
          results,
          key,
          stepResult.durationMs,
          'No batch verification result returned',
          errorMessage(stepResult.error),
          false,
          input.budgets[key],
        );
        return;
      }

      pushMeasuredResult(
        results,
        key,
        stepResult.durationMs,
        String(stepResult.value),
        'Expected batchVerifyProof to return true',
        stepResult.value === true,
        input.budgets[key],
      );
      return;
    }
  }
}

async function executeSteps(
  input: PreparedManualTestInput,
  stepKeys: readonly ManualStepKey[],
  runtimeState: ManualRuntimeState,
  options?: { now?: () => number },
): Promise<ManualTestRunResult> {
  const nextRuntimeState = cloneRuntimeState(runtimeState);
  const results: ManualStepResult[] = [];
  const now = options?.now ?? defaultNow;

  for (const key of stepKeys) {
    await runStep(input, key, nextRuntimeState, results, now);
  }

  return {
    results,
    runtimeState: nextRuntimeState,
    derivedOutputs: runtimeStateToDerivedOutputs(nextRuntimeState),
  };
}

export async function runManualTestStep(
  input: PreparedManualTestInput,
  key: ManualStepKey,
  runtimeState: ManualRuntimeState,
  options?: { now?: () => number },
): Promise<ManualStepRunResult> {
  const execution = await executeSteps(input, [key], runtimeState, options);

  return {
    result: execution.results[0],
    runtimeState: execution.runtimeState,
    derivedOutputs: execution.derivedOutputs,
  };
}

export async function runManualTestSuite(
  input: PreparedManualTestInput,
  options?: { now?: () => number },
): Promise<ManualTestRunResult> {
  return executeSteps(
    input,
    MANUAL_STEP_KEYS,
    createEmptyRuntimeState(),
    options,
  );
}
