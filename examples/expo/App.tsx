import { useState } from 'react';
import {
  type KeyboardTypeOptions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { createDefaultManualTestForm } from './src/fixtures';
import {
  prepareManualTestInput,
  runManualTestStep,
  runManualTestSuite,
  runtimeStateToDerivedOutputs,
} from './src/runner';
import {
  createEmptyRuntimeState,
  type ManualStepKey,
  type ManualStepResult,
} from './src/types';
import { budgetFieldId } from './src/utils';

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

  const isWeb = Platform.OS === 'web';
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
    if (field === 'budgets') {
      return;
    }

    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateBudget(step: ManualStepKey, value: string) {
    setForm((current) => ({
      ...current,
      budgets: {
        ...current.budgets,
        [step]: value,
      },
    }));
  }

  function resetToDefaults() {
    setForm(createDefaultManualTestForm());
    setRuntimeState(createEmptyRuntimeState());
    setResultsByKey({});
    setIsRunning(false);
  }

  function applyResult(result: ManualStepResult) {
    setResultsByKey((current) => ({
      ...current,
      [result.key]: result,
    }));
  }

  async function runSingle(step: ManualStepKey) {
    const preparedInput = validation.prepared;

    if (isWeb || isRunning || !preparedInput) {
      return;
    }

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

    if (isWeb || isRunning || !preparedInput) {
      return;
    }

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

  const baseDisabled = isWeb || isRunning || !validation.prepared;

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Confidential Asset Binding</Text>
            <Text style={styles.subtitle}>
              Compact manual harness over the public runtime-agnostic facade.
            </Text>
          </View>
          <View style={styles.headerActions}>
            <ActionButton
              label={isRunning ? 'Running...' : 'Run all'}
              onPress={runAll}
              disabled={baseDisabled}
              tone="primary"
            />
            <ActionButton
              label="Reset"
              onPress={resetToDefaults}
              disabled={isRunning}
              tone="secondary"
            />
          </View>
        </View>

        <View style={styles.summaryBar}>
          <Text style={styles.summaryText}>
            {resultList.length > 0
              ? `${resultCounts.pass} pass, ${resultCounts.warn} warn, ${resultCounts.fail} fail`
              : 'No function has been executed yet.'}
          </Text>
        </View>

        {isWeb ? (
          <Callout tone="warn">
            This harness is native-only. Web renders the inputs for inspection,
            but all run buttons stay disabled.
          </Callout>
        ) : null}

        {!validation.prepared ? (
          <Callout tone="fail">
            Fix the inline validation errors before running the bindings facade.
          </Callout>
        ) : null}

        <Card title="Shared Arguments">
          <CompactField
            label="valBase"
            value={form.valBaseHex}
            onChangeText={(value) => updateField('valBaseHex', value)}
            error={validation.errors.valBaseHex}
            multiline
          />
          <CompactField
            label="randBase"
            value={form.randBaseHex}
            onChangeText={(value) => updateField('randBaseHex', value)}
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
            onChangeText={(value) => updateField('solverPointHex', value)}
            error={validation.errors.solverPointHex}
            multiline
          />
          <FieldRow>
            <CompactField
              label="maxNumBits"
              value={form.solverMaxNumBits}
              onChangeText={(value) => updateField('solverMaxNumBits', value)}
              error={validation.errors.solverMaxNumBits}
              keyboardType="number-pad"
            />
            <CompactField
              label="expectedValue"
              value={form.expectedSolveValue}
              onChangeText={(value) => updateField('expectedSolveValue', value)}
              error={validation.errors.expectedSolveValue}
              keyboardType="number-pad"
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
            onChangeText={(value) => updateField('batchValuesCsv', value)}
            error={validation.errors.batchValuesCsv}
          />
          <CompactField
            label="blindingsFlat"
            value={form.batchBlindingsFlatHex}
            onChangeText={(value) =>
              updateField('batchBlindingsFlatHex', value)
            }
            error={validation.errors.batchBlindingsFlatHex}
            multiline
          />
          <FieldRow>
            <ReadonlyValue label="valueCount" value={currentBatchValueCount} />
            <CompactField
              label="numBits"
              value={form.batchNumBits}
              onChangeText={(value) => updateField('batchNumBits', value)}
              error={validation.errors.batchNumBits}
              keyboardType="number-pad"
            />
          </FieldRow>
          <FieldRow>
            <CompactField
              label="expectedProofBytes"
              value={form.expectedBatchProofBytes}
              onChangeText={(value) =>
                updateField('expectedBatchProofBytes', value)
              }
              error={validation.errors.expectedBatchProofBytes}
              keyboardType="number-pad"
            />
            <CompactField
              label="expectedCount"
              value={form.expectedBatchCount}
              onChangeText={(value) => updateField('expectedBatchCount', value)}
              error={validation.errors.expectedBatchCount}
              keyboardType="number-pad"
            />
          </FieldRow>
          <CompactField
            label="expectedCommsFlat"
            value={form.expectedBatchCommsFlatHex}
            onChangeText={(value) =>
              updateField('expectedBatchCommsFlatHex', value)
            }
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
            value={
              derivedOutputs.batchProofHex || 'Run batchRangeProof() first'
            }
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
              onChangeText={(value) => updateField('batchNumBits', value)}
              error={validation.errors.batchNumBits}
              keyboardType="number-pad"
            />
          </FieldRow>
        </FunctionCard>
      </ScrollView>
    </View>
  );
}

function Card(props: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{props.title}</Text>
      {props.children}
    </View>
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
    <View style={styles.card}>
      <View style={styles.functionHeader}>
        <View style={styles.functionHeaderCopy}>
          <Text style={styles.signature}>{props.signature}</Text>
          {props.note ? <Text style={styles.note}>{props.note}</Text> : null}
        </View>
        <ActionButton
          label="Run"
          onPress={props.onRun}
          disabled={props.runDisabled}
          tone="primary"
          compact
        />
      </View>

      <FieldRow>
        <CompactField
          label="budgetMs"
          value={props.budgetValue}
          onChangeText={props.onBudgetChange}
          error={props.budgetError}
          keyboardType="number-pad"
        />
      </FieldRow>

      {props.children}

      <ResultStrip result={props.result} />
    </View>
  );
}

function FieldRow(props: { children: React.ReactNode }) {
  return <View style={styles.fieldRow}>{props.children}</View>;
}

function CompactField(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  multiline?: boolean;
  keyboardType?: KeyboardTypeOptions;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        autoCapitalize="none"
        autoCorrect={false}
        multiline={props.multiline}
        numberOfLines={props.multiline ? 3 : 1}
        onChangeText={props.onChangeText}
        keyboardType={props.keyboardType}
        style={[
          styles.input,
          props.multiline ? styles.multilineInput : null,
          props.error ? styles.inputError : null,
        ]}
        value={props.value}
      />
      {props.error ? <Text style={styles.errorText}>{props.error}</Text> : null}
    </View>
  );
}

function ReadonlyValue(props: {
  label: string;
  value: string;
  multiline?: boolean;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        editable={false}
        multiline={props.multiline}
        numberOfLines={props.multiline ? 3 : 1}
        selectTextOnFocus={false}
        style={[
          styles.input,
          styles.readonlyInput,
          props.multiline ? styles.multilineInput : null,
        ]}
        value={props.value}
      />
    </View>
  );
}

function ResultStrip(props: { result?: ManualStepResult }) {
  if (!props.result) {
    return <Text style={styles.idleText}>Not run yet.</Text>;
  }

  const color = STATUS_COLORS[props.result.status];

  return (
    <View style={[styles.resultStrip, { borderColor: color }]}>
      <View style={styles.resultStripHeader}>
        <Text style={[styles.resultStatus, { color }]}>
          {props.result.status.toUpperCase()}
        </Text>
        <Text style={styles.resultDuration}>
          {props.result.durationMs.toFixed(1)} ms
        </Text>
      </View>
      <Text style={styles.resultText}>Actual: {props.result.summary}</Text>
      <Text style={styles.resultText}>Assertion: {props.result.assertion}</Text>
    </View>
  );
}

function Callout(props: { tone: 'warn' | 'fail'; children: React.ReactNode }) {
  return (
    <View
      style={[
        styles.callout,
        props.tone === 'warn' ? styles.warnCallout : styles.failCallout,
      ]}
    >
      <Text style={styles.calloutText}>{props.children}</Text>
    </View>
  );
}

function ActionButton(props: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tone: 'primary' | 'secondary';
  compact?: boolean;
}) {
  return (
    <Pressable
      disabled={props.disabled}
      onPress={props.onPress}
      style={[
        styles.button,
        props.compact ? styles.compactButton : null,
        props.tone === 'primary'
          ? styles.primaryButton
          : styles.secondaryButton,
        props.disabled ? styles.buttonDisabled : null,
      ]}
    >
      <Text
        style={[
          styles.buttonText,
          props.tone === 'secondary' ? styles.secondaryButtonText : null,
        ]}
      >
        {props.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f3f5f7',
  },
  content: {
    paddingHorizontal: 12,
    paddingVertical: 36,
    gap: 10,
  },
  header: {
    gap: 10,
  },
  headerCopy: {
    gap: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#132033',
  },
  subtitle: {
    fontSize: 13,
    lineHeight: 18,
    color: '#4f6179',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  summaryBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  summaryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#27415f',
  },
  card: {
    padding: 12,
    borderRadius: 14,
    backgroundColor: '#ffffff',
    gap: 8,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#132033',
  },
  functionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  functionHeaderCopy: {
    flex: 1,
    gap: 2,
  },
  signature: {
    fontSize: 14,
    fontWeight: '700',
    color: '#132033',
  },
  note: {
    fontSize: 12,
    lineHeight: 16,
    color: '#5e7087',
  },
  fieldRow: {
    flexDirection: 'row',
    gap: 8,
  },
  field: {
    flex: 1,
    gap: 4,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#27415f',
  },
  input: {
    borderWidth: 1,
    borderColor: '#c8d0da',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
    color: '#132033',
    backgroundColor: '#fbfcfd',
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  readonlyInput: {
    backgroundColor: '#eef2f6',
    color: '#4f6179',
  },
  inputError: {
    borderColor: '#c0394b',
  },
  errorText: {
    fontSize: 11,
    color: '#a11c2e',
  },
  button: {
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minWidth: 88,
    alignItems: 'center',
  },
  compactButton: {
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  primaryButton: {
    backgroundColor: '#132033',
  },
  secondaryButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#c8d0da',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryButtonText: {
    color: '#132033',
  },
  resultStrip: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 4,
    backgroundColor: '#fcfdff',
  },
  resultStripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  resultStatus: {
    fontSize: 11,
    fontWeight: '800',
  },
  resultDuration: {
    fontSize: 11,
    color: '#5e7087',
  },
  resultText: {
    fontSize: 12,
    lineHeight: 16,
    color: '#27415f',
  },
  idleText: {
    fontSize: 12,
    color: '#6b7b8f',
  },
  callout: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  warnCallout: {
    backgroundColor: '#fff5e7',
    borderColor: '#efc98d',
  },
  failCallout: {
    backgroundColor: '#fdecef',
    borderColor: '#f2b5bf',
  },
  calloutText: {
    fontSize: 13,
    lineHeight: 18,
    color: '#132033',
  },
});
