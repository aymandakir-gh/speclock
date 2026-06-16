/**
 * Vitest adapter. Runs `vitest run` with the JSON reporter and normalizes the
 * (Jest-compatible) report into a `TestRunResult`.
 *
 * `parseVitestReport` is exported and pure so the parsing logic is unit-tested
 * without spawning a process.
 */

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TestCaseResult, TestRunResult, TestStatus } from '../core/types.js';
import type { AdapterRunOptions, TestRunnerAdapter } from './types.js';
import { AdapterError } from './types.js';

const DEFAULT_TIMEOUT_MS = 120_000;

function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === 'object' && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : undefined;
}
function asArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}
function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function asNumber(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function normalizeStatus(status: unknown): TestStatus {
  if (status === 'passed') return 'passed';
  if (status === 'failed') return 'failed';
  // skipped, pending, todo, disabled, etc. all count as "not run / skipped".
  return 'skipped';
}

/** Normalize a Vitest JSON report into a TestRunResult. Pure. */
export function parseVitestReport(report: unknown): TestRunResult {
  const root = asRecord(report);
  if (!root) {
    throw new AdapterError('Vitest report was empty or not a JSON object.');
  }

  const tests: TestCaseResult[] = [];
  for (const fileRaw of asArray(root.testResults)) {
    const file = asRecord(fileRaw);
    if (!file) continue;
    const filePath = asString(file.name);
    for (const aRaw of asArray(file.assertionResults)) {
      const a = asRecord(aRaw);
      if (!a) continue;
      const title = asString(a.title) ?? '';
      const ancestors = asArray(a.ancestorTitles)
        .map(asString)
        .filter((s): s is string => s != null);
      const full = asString(a.fullName);
      const name = (full && full.trim() ? full : [...ancestors, title].join(' ')).trim();
      const duration = asNumber(a.duration);
      const test: TestCaseResult = { name, status: normalizeStatus(a.status) };
      if (filePath) test.file = filePath;
      if (duration != null) test.duration = duration;
      tests.push(test);
    }
  }

  const anyFailed = tests.some((t) => t.status === 'failed');
  const success = typeof root.success === 'boolean' ? root.success : undefined;
  const ok = success != null ? success && !anyFailed : !anyFailed;

  const result: TestRunResult = { ok, tests };
  if (!ok && tests.length === 0) {
    result.note = 'no tests were reported';
  }
  return result;
}

/** Walk up from `startDir` to find a local vitest binary. */
function resolveVitestBin(startDir: string): string | undefined {
  const binName = process.platform === 'win32' ? 'vitest.cmd' : 'vitest';
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', '.bin', binName);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

function spawnVitest(
  bin: string,
  args: string[],
  cwd: string,
  timeoutMs: number,
): Promise<SpawnResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, {
      cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGKILL');
    }, timeoutMs);
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString();
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
    });
    child.on('error', (e: Error) => {
      clearTimeout(timer);
      reject(new AdapterError(`Failed to start vitest: ${e.message}`));
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut });
    });
  });
}

export const vitestAdapter: TestRunnerAdapter = {
  name: 'vitest',
  async run(options: AdapterRunOptions): Promise<TestRunResult> {
    const { cwd } = options;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

    const bin = resolveVitestBin(cwd);
    if (!bin) {
      throw new AdapterError(
        `Could not find a vitest binary in node_modules (searched from ${cwd} upward). Install vitest in your project, or run speclock from the project root.`,
      );
    }

    const outFile = join(tmpdir(), `speclock-vitest-${randomUUID()}.json`);
    const args = [
      'run',
      '--reporter=json',
      `--outputFile=${outFile}`,
      '--passWithNoTests',
    ];
    if (options.configPath) args.push(`--config=${options.configPath}`);
    if (options.extraArgs) args.push(...options.extraArgs);

    const res = await spawnVitest(bin, args, cwd, timeoutMs);

    try {
      if (res.timedOut) {
        throw new AdapterError(`vitest timed out after ${timeoutMs}ms.`);
      }
      if (!existsSync(outFile)) {
        const diag = (res.stderr || res.stdout || '').trim();
        throw new AdapterError(
          `vitest did not produce a report (exit ${res.code ?? 'null'}).${diag ? `\n${diag}` : ''}`,
        );
      }
      let json: unknown;
      try {
        json = JSON.parse(readFileSync(outFile, 'utf8'));
      } catch (e) {
        throw new AdapterError(
          `Could not parse vitest JSON report: ${e instanceof Error ? e.message : String(e)}`,
        );
      }
      return parseVitestReport(json);
    } finally {
      try {
        rmSync(outFile, { force: true });
      } catch {
        /* best-effort cleanup */
      }
    }
  },
};
