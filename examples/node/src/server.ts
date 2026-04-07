import http from 'node:http';
import { createDefaultManualTestForm } from './fixtures.js';
import {
  prepareManualTestInput,
  runManualTestStep,
  runManualTestSuite,
} from './runner.js';
import {
  createEmptyRuntimeState,
  MANUAL_STEP_KEYS,
  type ManualStepKey,
  type ManualTestFormState,
} from './types.js';

const PORT = Number(process.env.PORT ?? 3000);

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      const raw = Buffer.concat(chunks).toString();
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error('Invalid JSON body'));
      }
    });
    req.on('error', reject);
  });
}

function send(res: http.ServerResponse, status: number, body: unknown): void {
  const payload = JSON.stringify(body, null, 2);
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  });
  res.end(payload);
}

function mergeForm(overrides: unknown): ManualTestFormState {
  const defaults = createDefaultManualTestForm();
  if (overrides && typeof overrides === 'object') {
    return { ...defaults, ...(overrides as Partial<ManualTestFormState>) };
  }
  return defaults;
}

async function handleRunAll(
  res: http.ServerResponse,
  overrides: unknown,
): Promise<void> {
  const form = mergeForm(overrides);
  const { errors, prepared } = prepareManualTestInput(form);

  if (!prepared) {
    const first = Object.values(errors)[0] ?? 'Validation failed';
    send(res, 400, { error: first, errors });
    return;
  }

  const result = await runManualTestSuite(prepared);
  send(res, 200, result);
}

async function handleRunStep(
  res: http.ServerResponse,
  step: ManualStepKey,
  overrides: unknown,
): Promise<void> {
  const form = mergeForm(overrides);
  const { errors, prepared } = prepareManualTestInput(form);

  if (!prepared) {
    const first = Object.values(errors)[0] ?? 'Validation failed';
    send(res, 400, { error: first, errors });
    return;
  }

  const result = await runManualTestStep(
    prepared,
    step,
    createEmptyRuntimeState(),
  );
  send(res, 200, result);
}

const server = http.createServer(async (req, res) => {
  const method = req.method ?? 'GET';
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const path = url.pathname;

  try {
    // GET /health
    if (method === 'GET' && path === '/health') {
      send(res, 200, { ok: true });
      return;
    }

    // GET /run-all — default fixtures, no body needed (easy browser/curl validation)
    if (method === 'GET' && path === '/run-all') {
      await handleRunAll(res, {});
      return;
    }

    // POST /run-all — optional JSON body with form overrides
    if (method === 'POST' && path === '/run-all') {
      const body = await readBody(req);
      await handleRunAll(res, body);
      return;
    }

    // POST /run/:step
    if (method === 'POST' && path.startsWith('/run/')) {
      const stepKey = path.slice('/run/'.length) as ManualStepKey;
      if (!(MANUAL_STEP_KEYS as readonly string[]).includes(stepKey)) {
        send(res, 404, {
          error: `Unknown step "${stepKey}". Valid steps: ${MANUAL_STEP_KEYS.join(', ')}`,
        });
        return;
      }
      const body = await readBody(req);
      await handleRunStep(res, stepKey, body);
      return;
    }

    send(res, 404, { error: 'Not found' });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    send(res, 500, { error: message });
  }
});

server.listen(PORT, () => {
  console.log(`Listening on http://localhost:${PORT}`);
  console.log();
  console.log('  GET  /health         liveness check');
  console.log('  GET  /run-all        run all 5 steps with default fixtures');
  console.log('  POST /run-all        same with optional JSON body overrides');
  console.log(
    `  POST /run/:step      run one step (steps: ${MANUAL_STEP_KEYS.join(', ')})`,
  );
});
