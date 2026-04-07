import { useState } from 'react';
import { createDefaultManualTestForm } from './fixtures';
import {
  prepareManualTestInput,
  runManualTestStep,
  runManualTestSuite,
  runtimeStateToDerivedOutputs,
} from './runner';
import {
  createEmptyRuntimeState,
  type ManualStepKey,
  type ManualStepResult,
} from './types';
import { budgetFieldId } from './utils';

const STATUS_COLORS = {
  pass: '#197a43',
  warn: '#9a5a00',
  fail: '#a11c2e',
} as const;

export default function App() {
  const [form, setForm] = useState(createDefaultManualTestForm);
  const [runtimeState, setRuntimeState] = useState(createEmptyRuntimeState);
  const [resultsByKey, setResultsByKey] = useState<
    Partial<Record<ManualStepKey, ManualStepResult>>
  >({});
  const [isRunning, setIsRunning] = useState(false);

  const validation = prepareManualTestInput(form);
  const derivedOutputs = runtimeStateToDerivedOutputs(runtimeState);
  const currentBatchValueCount = validation.prepared
    ? String(validation.prepared.batch.valueCount)
    : 'Invalid values';
  const resultList = Object.values(resultsByKey).filter(
    (result): result is ManualStepResult => Boolean(result),
  );
  const resultCounts = resultList.reduce(
    (counts, result) => {
      counts[result.status] += 1;
      return counts;
    },
    { pass: 0, warn: 0, fail: 0 },
  );
  const hasBatchOutputs =
    runtimeState.batchProof !== null &&
    runtimeState.batchCommsFlat !== null &&
    runtimeState.batchCount !== null;

  function updateField(field: keyof typeof form, value: string) {
    if (field === 'budgets') return;
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateBudget(step: ManualStepKey, value: string) {
    setForm((current) => ({
      ...current,
      budgets: { ...current.budgets, [step]: value },
    }));
  }

  function resetToDefaults() {
    setForm(createDefaultManualTestForm());
    setRuntimeState(createEmptyRuntimeState());
    setResultsByKey({});
    setIsRunning(false);
  }

  function applyResult(result: ManualStepResult) {
    setResultsByKey((current) => ({ ...current, [result.key]: result }));
  }

  async function runSingle(step: ManualStepKey) {
    const preparedInput = validation.prepared;
    if (isRunning || !preparedInput) return;
    setIsRunning(true);
    try {
      const execution = await runManualTestStep(
        preparedInput,
        step,
        runtimeState,
      );
      setRuntimeState(execution.runtimeState);
      applyResult(execution.result);
    } finally {
      setIsRunning(false);
    }
  }

  async function runAll() {
    const preparedInput = validation.prepared;
    if (isRunning || !preparedInput) return;
    setIsRunning(true);
    try {
      const execution = await runManualTestSuite(preparedInput);
      setRuntimeState(execution.runtimeState);
      setResultsByKey(
        Object.fromEntries(
          execution.results.map((result) => [result.key, result]),
        ) as Partial<Record<ManualStepKey, ManualStepResult>>,
      );
    } finally {
      setIsRunning(false);
    }
  }

  const baseDisabled = isRunning || !validation.prepared;

  return (
    <div className="content">
      <div className="header">
        <div className="header-copy">
          <span className="title">Confidential Asset Binding</span>
          <span className="subtitle">
            Compact manual harness over the public runtime-agnostic facade.
          </span>
        </div>
        <div className="header-actions">
          <ActionButton
            label={isRunning ? 'Running...' : 'Run all'}
            onClick={runAll}
            disabled={baseDisabled}
            tone="primary"
          />
          <ActionButton
            label="Reset"
            onClick={resetToDefaults}
            disabled={isRunning}
            tone="secondary"
          />
        </div>
      </div>

      <div className="summary-bar">
        <span className="summary-text">
          {resultList.length > 0
            ? `${resultCounts.pass} pass, ${resultCounts.warn} warn, ${resultCounts.fail} fail`
            : 'No function has been executed yet.'}
        </span>
      </div>

      {!validation.prepared ? (
        <div className="callout callout-fail">
          Fix the inline validation errors before running the bindings facade.
        </div>
      ) : null}

      <Card title="Shared Arguments">
        <CompactField
          label="valBase"
          value={form.valBaseHex}
          onChange={(value) => updateField('valBaseHex', value)}
          error={validation.errors.valBaseHex}
          multiline
        />
        <CompactField
          label="randBase"
          value={form.randBaseHex}
          onChange={(value) => updateField('randBaseHex', value)}
          error={validation.errors.randBaseHex}
          multiline
        />
      </Card>

      <FunctionCard
        signature="solveDiscreteLog(point, maxNumBits)"
        result={resultsByKey.solveDiscreteLog}
        budgetValue={form.budgets.solveDiscreteLog}
        budgetError={validation.errors[budgetFieldId('solveDiscreteLog')]}
        onBudgetChange={(value) => updateBudget('solveDiscreteLog', value)}
        onRun={() => runSingle('solveDiscreteLog')}
        runDisabled={baseDisabled}
        note="Solves the discrete log for the given EC point using the internal singleton solver."
      >
        <CompactField
          label="point"
          value={form.solverPointHex}
          onChange={(value) => updateField('solverPointHex', value)}
          error={validation.errors.solverPointHex}
          multiline
        />
        <FieldRow>
          <CompactField
            label="maxNumBits"
            value={form.solverMaxNumBits}
            onChange={(value) => updateField('solverMaxNumBits', value)}
            error={validation.errors.solverMaxNumBits}
          />
          <CompactField
            label="expectedValue"
            value={form.expectedSolveValue}
            onChange={(value) => updateField('expectedSolveValue', value)}
            error={validation.errors.expectedSolveValue}
          />
        </FieldRow>
      </FunctionCard>

      <FunctionCard
        signature="batchRangeProof(values, rs, valBase, randBase, numBits)"
        result={resultsByKey.batchRangeProof}
        budgetValue={form.budgets.batchRangeProof}
        budgetError={validation.errors[budgetFieldId('batchRangeProof')]}
        onBudgetChange={(value) => updateBudget('batchRangeProof', value)}
        onRun={() => runSingle('batchRangeProof')}
        runDisabled={baseDisabled}
        note="Uses shared valBase and randBase above, then stores proof, commsFlat, and count for batchVerifyProof()."
      >
        <CompactField
          label="values"
          value={form.batchValuesCsv}
          onChange={(value) => updateField('batchValuesCsv', value)}
          error={validation.errors.batchValuesCsv}
        />
        <CompactField
          label="blindingsFlat"
          value={form.batchBlindingsFlatHex}
          onChange={(value) => updateField('batchBlindingsFlatHex', value)}
          error={validation.errors.batchBlindingsFlatHex}
          multiline
        />
        <FieldRow>
          <ReadonlyValue label="valueCount" value={currentBatchValueCount} />
          <CompactField
            label="numBits"
            value={form.batchNumBits}
            onChange={(value) => updateField('batchNumBits', value)}
            error={validation.errors.batchNumBits}
          />
        </FieldRow>
        <FieldRow>
          <CompactField
            label="expectedProofBytes"
            value={form.expectedBatchProofBytes}
            onChange={(value) => updateField('expectedBatchProofBytes', value)}
            error={validation.errors.expectedBatchProofBytes}
          />
          <CompactField
            label="expectedCount"
            value={form.expectedBatchCount}
            onChange={(value) => updateField('expectedBatchCount', value)}
            error={validation.errors.expectedBatchCount}
          />
        </FieldRow>
        <CompactField
          label="expectedCommsFlat"
          value={form.expectedBatchCommsFlatHex}
          onChange={(value) => updateField('expectedBatchCommsFlatHex', value)}
          error={validation.errors.expectedBatchCommsFlatHex}
          multiline
        />
        <ReadonlyValue
          label="proof"
          value={derivedOutputs.batchProofHex || 'Not generated yet'}
          multiline
        />
        <ReadonlyValue
          label="commsFlat"
          value={derivedOutputs.batchCommsFlatHex || 'Not generated yet'}
          multiline
        />
        <ReadonlyValue
          label="commCount"
          value={derivedOutputs.batchCount || 'Not generated yet'}
        />
      </FunctionCard>

      <FunctionCard
        signature="batchVerifyProof(proof, comms, valBase, randBase, numBits)"
        result={resultsByKey.batchVerifyProof}
        budgetValue={form.budgets.batchVerifyProof}
        budgetError={validation.errors[budgetFieldId('batchVerifyProof')]}
        onBudgetChange={(value) => updateBudget('batchVerifyProof', value)}
        onRun={() => runSingle('batchVerifyProof')}
        runDisabled={baseDisabled || !hasBatchOutputs}
        note="Consumes the last proof, commsFlat, and count produced by batchRangeProof()."
      >
        <ReadonlyValue
          label="proof"
          value={derivedOutputs.batchProofHex || 'Run batchRangeProof() first'}
          multiline
        />
        <ReadonlyValue
          label="commsFlat"
          value={
            derivedOutputs.batchCommsFlatHex || 'Run batchRangeProof() first'
          }
          multiline
        />
        <FieldRow>
          <ReadonlyValue
            label="commCount"
            value={derivedOutputs.batchCount || 'Run batchRangeProof() first'}
          />
          <CompactField
            label="numBits"
            value={form.batchNumBits}
            onChange={(value) => updateField('batchNumBits', value)}
            error={validation.errors.batchNumBits}
          />
        </FieldRow>
      </FunctionCard>
    </div>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="card">
      <span className="card-title">{props.title}</span>
      {props.children}
    </div>
  );
}

function FunctionCard(props: {
  signature: string;
  result?: ManualStepResult;
  budgetValue: string;
  budgetError?: string;
  onBudgetChange: (value: string) => void;
  onRun: () => void;
  runDisabled: boolean;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="card">
      <div className="function-header">
        <div className="function-header-copy">
          <span className="signature">{props.signature}</span>
          {props.note ? <span className="note">{props.note}</span> : null}
        </div>
        <ActionButton
          label="Run"
          onClick={props.onRun}
          disabled={props.runDisabled}
          tone="primary"
          compact
        />
      </div>

      <FieldRow>
        <CompactField
          label="budgetMs"
          value={props.budgetValue}
          onChange={props.onBudgetChange}
          error={props.budgetError}
        />
      </FieldRow>

      {props.children}

      <ResultStrip result={props.result} />
    </div>
  );
}

function FieldRow(props: { children: React.ReactNode }) {
  return <div className="field-row">{props.children}</div>;
}

function CompactField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  multiline?: boolean;
}) {
  return (
    <div className="field">
      <span className="label">{props.label}</span>
      {props.multiline ? (
        <textarea
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className={[
            'input',
            'input-multiline',
            props.error ? 'input-error' : '',
          ]
            .filter(Boolean)
            .join(' ')}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
          rows={3}
        />
      ) : (
        <input
          spellCheck={false}
          autoCapitalize="none"
          autoCorrect="off"
          className={['input', props.error ? 'input-error' : '']
            .filter(Boolean)
            .join(' ')}
          value={props.value}
          onChange={(e) => props.onChange(e.target.value)}
        />
      )}
      {props.error ? <span className="error-text">{props.error}</span> : null}
    </div>
  );
}

function ReadonlyValue(props: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <div className="field">
      <span className="label">{props.label}</span>
      {props.multiline ? (
        <textarea
          readOnly
          className="input input-multiline input-readonly"
          value={props.value}
          rows={3}
        />
      ) : (
        <input readOnly className="input input-readonly" value={props.value} />
      )}
    </div>
  );
}

function ResultStrip(props: { result?: ManualStepResult }) {
  if (!props.result) {
    return <span className="idle-text">Not run yet.</span>;
  }

  const color = STATUS_COLORS[props.result.status];

  return (
    <div className="result-strip" style={{ borderColor: color }}>
      <div className="result-strip-header">
        <span className="result-status" style={{ color }}>
          {props.result.status.toUpperCase()}
        </span>
        <span className="result-duration">
          {props.result.durationMs.toFixed(1)} ms
        </span>
      </div>
      <span className="result-text">Actual: {props.result.summary}</span>
      <span className="result-text">Assertion: {props.result.assertion}</span>
    </div>
  );
}

function ActionButton(props: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  tone: 'primary' | 'secondary';
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={props.disabled}
      onClick={props.onClick}
      className={[
        'button',
        props.compact ? 'button-compact' : '',
        props.tone === 'primary' ? 'button-primary' : 'button-secondary',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {props.label}
    </button>
  );
}
