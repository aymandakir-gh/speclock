/**
 * pytest adapter. Runs `pytest --junit-xml=<tmp>` and parses the JUnit XML into
 * a `TestRunResult` with the pure `parseJUnitXml`.
 *
 * pytest is a system tool, not a node_modules binary, so the adapter spawns
 * `pytest` from PATH by default. Override the invocation with the
 * `SPECLOCK_PYTEST` env var (e.g. `SPECLOCK_PYTEST="python -m pytest"`).
 */

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TestRunResult } from '../core/types.js';
import type { AdapterRunOptions, TestRunnerAdapter } from './types.js';
import { AdapterError } from './types.js';
import { spawnProcess } from './spawn.js';
import { parseJUnitXml } from './junit.js';

const DEFAULT_TIMEOUT_MS = 120_000;

// pytest exit codes (https://docs.pytest.org/en/stable/reference/exit-codes.html)
const EXIT_NO_TESTS_COLLECTED = 5;

/** Resolve the pytest invocation (command + leading args), honoring the env override. */
export function pytestCommand(env: NodeJS.ProcessEnv = process.env): {
  cmd: string;
  baseArgs: string[];
} {
  const override = env.SPECLOCK_PYTEST?.trim();
  if (override) {
    const parts = override.split(/\s+/);
    return { cmd: parts[0]!, baseArgs: parts.slice(1) };
  }
  return { cmd: 'pytest', baseArgs: [] };
}

export const pytestAdapter: TestRunnerAdapter = {
  name: 'pytest',
  async run(options: AdapterRunOptions): Promise<TestRunResult> {
    const { cwd } = options;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const { cmd, baseArgs } = pytestCommand();

    const outFile = join(tmpdir(), `speclock-pytest-${randomUUID()}.xml`);
    const args = [...baseArgs, `--junit-xml=${outFile}`, '-q', '-p', 'no:cacheprovider'];
    if (options.configPath) args.push('-c', options.configPath);
    if (options.extraArgs) args.push(...options.extraArgs);

    const res = await spawnProcess(cmd, args, { cwd, timeoutMs, label: 'pytest' });

    try {
      if (res.timedOut) {
        throw new AdapterError(`pytest timed out after ${timeoutMs}ms.`);
      }
      if (!existsSync(outFile)) {
        // pytest normally still writes a report when no tests are collected; if a
        // build of pytest doesn't, treat "no tests collected" as an empty suite.
        if (res.code === EXIT_NO_TESTS_COLLECTED) return { ok: true, tests: [] };
        const diag = (res.stderr || res.stdout || '').trim();
        throw new AdapterError(
          `pytest did not produce a JUnit report (exit ${res.code ?? 'null'}). Is pytest installed? Set SPECLOCK_PYTEST to override the command.${diag ? `\n${diag}` : ''}`,
        );
      }
      const result = parseJUnitXml(readFileSync(outFile, 'utf8'));
      // pytest exit codes: 0 = all passed, 1 = tests failed, 5 = no tests
      // collected. Anything else (2 = interrupted, 3 = internal error, 4 =
      // usage, or a signal kill → null) means the run did not complete, and a
      // partial JUnit report's per-test passes must NOT be trusted as green.
      if (res.code !== 0 && res.code !== 1 && res.code !== EXIT_NO_TESTS_COLLECTED) {
        return {
          ...result,
          ok: false,
          note: `pytest exited abnormally (code ${res.code ?? 'null'}); the run was interrupted or errored before completing.`,
        };
      }
      return result;
    } finally {
      try {
        rmSync(outFile, { force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  },
};
