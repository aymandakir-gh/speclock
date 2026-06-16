/**
 * Shared runner for adapters whose test runner can write a JSON report to a
 * file (Vitest, Jest). Spawns the runner, reads the report, parses it with the
 * adapter-supplied pure parser, and always cleans up the temp file.
 */

import { existsSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { TestRunResult } from '../core/types.js';
import { AdapterError } from './types.js';
import { spawnProcess } from './spawn.js';

export interface JsonReporterRun {
  /** Absolute path to the runner binary. */
  bin: string;
  cwd: string;
  timeoutMs: number;
  /** Label used in diagnostics (e.g. "vitest"). */
  label: string;
  /** Build the runner args given the temp report path to write to. */
  buildArgs: (outFile: string) => string[];
  /** Pure parser turning the runner's JSON report into a TestRunResult. */
  parse: (json: unknown) => TestRunResult;
}

export async function runJsonReporter(run: JsonReporterRun): Promise<TestRunResult> {
  const outFile = join(tmpdir(), `speclock-${run.label}-${randomUUID()}.json`);
  const res = await spawnProcess(run.bin, run.buildArgs(outFile), {
    cwd: run.cwd,
    timeoutMs: run.timeoutMs,
    label: run.label,
  });

  try {
    if (res.timedOut) {
      throw new AdapterError(`${run.label} timed out after ${run.timeoutMs}ms.`);
    }
    if (!existsSync(outFile)) {
      // A clean exit with no report means the runner found no tests to run
      // (e.g. vitest with --passWithNoTests on an empty/zero-match suite). Treat
      // that as an empty suite — so criteria resolve as untested and `check`
      // exits 1 — rather than a config error. Only a non-zero exit with no
      // report is a genuine failure to produce output.
      if (res.code === 0) return { ok: true, tests: [] };
      const diag = (res.stderr || res.stdout || '').trim();
      throw new AdapterError(
        `${run.label} did not produce a report (exit ${res.code ?? 'null'}).${diag ? `\n${diag}` : ''}`,
      );
    }
    let json: unknown;
    try {
      json = JSON.parse(readFileSync(outFile, 'utf8'));
    } catch (e) {
      throw new AdapterError(
        `Could not parse ${run.label} JSON report: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    return run.parse(json);
  } finally {
    try {
      rmSync(outFile, { force: true });
    } catch {
      /* best-effort cleanup */
    }
  }
}
