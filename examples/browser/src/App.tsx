import {
  batchRangeProof,
  batchVerifyProof,
  solveDiscreteLog,
} from '@aptos-labs/confidential-asset-bindings';
import { useEffect, useState } from 'react';
import './App.css';

function hex(s: string): Uint8Array {
  const b = new Uint8Array(s.length / 2);
  for (let i = 0; i < s.length; i += 2)
    b[i / 2] = parseInt(s.slice(i, i + 2), 16);
  return b;
}

const POINT = hex(
  'e00af9c74d9edb8ebcc160ceec97d531cbd6e2956f9e9162b8e9eda260e82e43',
);
const VAL_BASE = hex(
  'e2f2ae0a6abc4e71a884a961c500515f58e30b6aa582dd8db6a65945e08d2d76',
);
const RAND_BASE = hex(
  '8c9240b456a9e6dc65c377a1048d745f94a08cdb7f44cbcd7b46f34048871134',
);
const BLINDINGS = [
  hex('0909090909090909090909090909090909090909090909090909090909090909'),
  hex('0909090909090909090909090909090909090909090909090909090909090909'),
];
const EXPECTED_COMMS_HEX =
  '761954bce2b8355c84daae57fcfab355b45c74dec69a9bb9847a93a9fcbd0c35' +
  'fa76df206c370ad9663d6cc1b54e74815bfc01371ea0e53b7952a7fd02a9106a';

type TestResult = {
  label: string;
  pass: boolean;
  durationMs: number;
  error?: string;
};

async function runTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  let proof: Uint8Array | undefined;
  let comms: Uint8Array[] | undefined;

  // solveDiscreteLog
  {
    const t = performance.now();
    try {
      const n = await solveDiscreteLog(POINT, 16);
      results.push({
        label: 'solveDiscreteLog',
        pass: n === 42n,
        durationMs: performance.now() - t,
      });
    } catch (e) {
      results.push({
        label: 'solveDiscreteLog',
        pass: false,
        durationMs: performance.now() - t,
        error: String(e),
      });
    }
  }

  // batchRangeProof
  {
    const t = performance.now();
    try {
      const result = await batchRangeProof({
        v: [1n, 2n],
        rs: BLINDINGS,
        valBase: VAL_BASE,
        randBase: RAND_BASE,
        numBits: 16,
      });
      const flat = new Uint8Array(result.comms.length * 32);
      result.comms.forEach((c, i) => {
        flat.set(c, i * 32);
      });
      const flatHex = Array.from(flat)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
      proof = result.proof;
      comms = result.comms;
      results.push({
        label: 'batchRangeProof',
        pass:
          result.proof.length === 608 &&
          flatHex === EXPECTED_COMMS_HEX &&
          result.comms.length === 2,
        durationMs: performance.now() - t,
      });
    } catch (e) {
      results.push({
        label: 'batchRangeProof',
        pass: false,
        durationMs: performance.now() - t,
        error: String(e),
      });
    }
  }
  if (!proof || !comms) {
    results.push({
      label: 'batchVerifyProof',
      pass: false,
      durationMs: 0,
      error: 'batchRangeProof failed',
    });
  } else {
    const t = performance.now();
    try {
      const valid = await batchVerifyProof({
        proof,
        comms,
        valBase: VAL_BASE,
        randBase: RAND_BASE,
        numBits: 16,
      });
      results.push({
        label: 'batchVerifyProof',
        pass: valid,
        durationMs: performance.now() - t,
      });
    } catch (e) {
      results.push({
        label: 'batchVerifyProof',
        pass: false,
        durationMs: performance.now() - t,
        error: String(e),
      });
    }
  }

  return results;
}

export default function App() {
  const [results, setResults] = useState<TestResult[] | null>(null);

  function run() {
    setResults(null);
    runTests().then(setResults);
  }

  useEffect(run, []);

  return (
    <div className="content">
      <div className="header">
        <span className="title">Confidential Asset Bindings</span>
        <button
          type="button"
          onClick={run}
          disabled={results === null}
          className="button"
        >
          {results === null ? 'Running...' : 'Run again'}
        </button>
      </div>
      {results === null ? (
        <span className="idle-text">Running...</span>
      ) : (
        results.map((r) => (
          <div
            key={r.label}
            className={`row ${r.pass ? 'row-pass' : 'row-fail'}`}
          >
            <div className="row-header">
              <span className="row-label">{r.label}</span>
              <span
                className={`row-status ${r.pass ? 'status-pass' : 'status-fail'}`}
              >
                {r.pass ? 'PASS' : 'FAIL'}
              </span>
            </div>
            <span className="row-duration">{r.durationMs.toFixed(1)} ms</span>
            {r.error ? <span className="row-error">{r.error}</span> : null}
          </div>
        ))
      )}
    </div>
  );
}
