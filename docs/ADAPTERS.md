# Writing a test-runner adapter

speclock doesn't run tests itself — it asks an **adapter** to run your suite and
hand back a normalized result. **Vitest and Jest ship today**; this guide shows
how to add another runner (pytest, `go test`, …).

## The contract

An adapter implements `TestRunnerAdapter` (`src/adapters/types.ts`):

```ts
export interface TestRunnerAdapter {
  readonly name: string;
  run(options: AdapterRunOptions): Promise<TestRunResult>;
}

export interface AdapterRunOptions {
  cwd: string;            // project root to run in
  configPath?: string;    // optional explicit runner config
  extraArgs?: string[];   // forwarded verbatim
  timeoutMs?: number;     // default 120000
}
```

It returns a `TestRunResult` (`src/core/types.ts`):

```ts
export interface TestRunResult {
  ok: boolean;                 // suite completed AND every non-skipped test passed
  tests: TestCaseResult[];
  note?: string;               // optional human-readable summary
}

export interface TestCaseResult {
  name: string;                // FULL name (describe chain + title) — speclock
                               //   matches the `[criterion-id]` tag inside this
  status: 'passed' | 'failed' | 'skipped';
  file?: string;
  duration?: number;           // ms
}
```

The single most important field is `name`: it must contain the full, human
test name, because that's where speclock looks for the `[AC-1]` tag (and any
explicit substrings from the lock).

## Recommended shape

Split the adapter into two parts so the logic is testable without spawning a
process:

1. **A pure parser** — `parseXReport(raw: unknown): TestRunResult`. Unit-test it
   against captured/synthetic report fixtures.
2. **A thin runner** — `run()` spawns the test process, points it at a structured
   reporter, reads the output, and calls the parser.

This is exactly how the Vitest and Jest adapters are built — they share both the
pure parser (`src/adapters/jest-report.ts`, since Vitest's JSON reporter is
Jest-compatible) and the I/O helpers:

- `src/adapters/spawn.ts` — `resolveLocalBin(startDir, bin)` and `spawnProcess()`
  (a hard timeout that kills the whole process group; UTF-8 capture).
- `src/adapters/run-json.ts` — `runJsonReporter()` spawns a runner that writes a
  JSON report to a temp file, reads it, parses it, and cleans up.

```ts
import { resolveLocalBin } from './spawn.js';
import { runJsonReporter } from './run-json.js';
import { parseJestStyleReport } from './jest-report.js';

export const jestAdapter: TestRunnerAdapter = {
  name: 'jest',
  run(options) {
    const bin = resolveLocalBin(options.cwd, 'jest');
    if (!bin) throw new AdapterError('Could not find a jest binary…');
    return runJsonReporter({
      bin, cwd: options.cwd, timeoutMs: options.timeoutMs ?? 120_000, label: 'jest',
      buildArgs: (out) => ['--json', `--outputFile=${out}`, '--passWithNoTests'],
      parse: parseJestStyleReport,
    });
  },
};
```

A runner that emits XML or another format (e.g. pytest's JUnit XML) writes its
own pure parser instead of reusing `parseJestStyleReport`, but still leans on
`spawn.ts` for the process plumbing.

### Normalizing status

Collapse the runner's vocabulary to three states:

| Runner says | speclock status |
|-------------|-----------------|
| passed      | `passed`        |
| failed / error | `failed`     |
| skipped / pending / todo / xfail | `skipped` |

A skipped test does **not** satisfy a criterion (a criterion needs a *passing*
mapped test), so mapping it to `skipped` is correct.

### Computing `ok`

`ok` is suite-level: `true` only if the run completed and no test failed. Use the
runner's own success flag when it has one, AND verify no test is `failed`:

```ts
const anyFailed = tests.some(t => t.status === 'failed');
const ok = typeof report.success === 'boolean' ? report.success && !anyFailed : !anyFailed;
```

## Errors

Throw `AdapterError` (`src/adapters/types.ts`) when you can't run the suite or
parse its output (binary missing, config error, malformed report, timeout).
`check`/`status` catch it and exit `2` (usage/config error) with your message —
so make the message actionable.

## Registering it

Add it to the registry in `src/adapters/index.ts` (Vitest and Jest are already
there):

```ts
const REGISTRY: Record<string, TestRunnerAdapter> = {
  vitest: vitestAdapter,
  jest: jestAdapter,
  pytest: pytestAdapter,   // <- your new adapter
};
```

Users select it with `speclock check --runner pytest`.

## Checklist

- [ ] `name` is the runner's lowercase id.
- [ ] Pure `parseXReport` with unit tests over fixtures.
- [ ] `run()` is read-only on user code, respects `timeoutMs`, cleans up temp files.
- [ ] Status normalized to passed/failed/skipped; `ok` computed correctly.
- [ ] `AdapterError` for all failure modes, with actionable messages.
- [ ] Registered in `src/adapters/index.ts`.
- [ ] An integration test that runs a small real fixture (see
      `tests/fixtures/sample-vitest-project/`).
