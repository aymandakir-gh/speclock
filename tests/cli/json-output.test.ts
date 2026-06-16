import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCheckCommand } from '../../src/cli/commands/check.js';
import { runStatusCommand } from '../../src/cli/commands/status.js';
import type { TestRunnerAdapter } from '../../src/adapters/types.js';
import type { TestRunResult } from '../../src/core/types.js';

const LOCK = [
  'version: 1',
  'spec: SPEC.md',
  'criteria:',
  '  - id: AC-1',
  '    description: First',
  '    tests: []',
  '  - id: AC-2',
  '    description: Second',
  '    tests: []',
  '',
].join('\n');

/** An adapter that returns a fixed run result without spawning anything. */
function fakeAdapter(result: TestRunResult): TestRunnerAdapter {
  return { name: 'fake', run: async () => result };
}

function withLockDir(fn: (dir: string) => Promise<void> | void): Promise<void> | void {
  const dir = mkdtempSync(join(tmpdir(), 'speclock-json-'));
  mkdirSync(join(dir, 'specs'));
  writeFileSync(join(dir, 'specs', 'spec.yaml'), LOCK);
  return Promise.resolve(fn(dir)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

/** Run a command capturing everything written to stdout/stderr. */
async function capture(fn: () => Promise<number>): Promise<{ code: number; stdout: string; stderr: string }> {
  let stdout = '';
  let stderr = '';
  const o = vi.spyOn(process.stdout, 'write').mockImplementation((s: string | Uint8Array) => {
    stdout += String(s);
    return true;
  });
  const e = vi.spyOn(process.stderr, 'write').mockImplementation((s: string | Uint8Array) => {
    stderr += String(s);
    return true;
  });
  try {
    const code = await fn();
    return { code, stdout, stderr };
  } finally {
    o.mockRestore();
    e.mockRestore();
  }
}

describe('check --json', () => {
  it('[SL-12] prints pure JSON on stdout and exits 0 when all criteria pass', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({
        ok: true,
        tests: [
          { name: '[AC-1] one', status: 'passed' },
          { name: '[AC-2] two', status: 'passed' },
        ],
      });
      const { code, stdout, stderr } = await capture(() =>
        runCheckCommand({ dir: 'specs', runner: 'fake', json: true, cwd: dir, adapter }),
      );
      expect(code).toBe(0);
      // stdout is exactly one parseable JSON object — no human prose mixed in.
      const json = JSON.parse(stdout);
      expect(json.command).toBe('check');
      expect(json.ok).toBe(true);
      expect(json.summary.total).toBe(2);
      expect(json.runner).toBe('fake');
      // In JSON mode the "Ran …" diagnostic is suppressed; stdout has no prose.
      expect(stderr).toBe('');
    });
  });

  it('[SL-12] exits 1 with problems when a mapped test fails', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({
        ok: false,
        tests: [
          { name: '[AC-1] one', status: 'passed' },
          { name: '[AC-2] two', status: 'failed' },
        ],
      });
      const { code, stdout } = await capture(() =>
        runCheckCommand({ dir: 'specs', runner: 'fake', json: true, cwd: dir, adapter }),
      );
      expect(code).toBe(1);
      const json = JSON.parse(stdout);
      expect(json.ok).toBe(false);
      expect(json.problems.some((p: string) => p.includes('AC-2'))).toBe(true);
    });
  });

  it('[SL-12] emits a JSON error object and exit 2 on a config error', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'speclock-json-empty-'));
    try {
      const { code, stdout } = await capture(() =>
        runCheckCommand({ dir: 'specs', runner: 'fake', json: true, cwd: empty, adapter: fakeAdapter({ ok: true, tests: [] }) }),
      );
      expect(code).toBe(2);
      const json = JSON.parse(stdout);
      expect(json.ok).toBe(false);
      expect(typeof json.error).toBe('string');
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('status --json', () => {
  it('[SL-13] prints coverage JSON on stdout and always exits 0', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({
        ok: false,
        tests: [{ name: '[AC-1] one', status: 'passed' }],
      });
      const { code, stdout } = await capture(() =>
        runStatusCommand({ dir: 'specs', runner: 'fake', json: true, cwd: dir, adapter }),
      );
      expect(code).toBe(0); // status never gates
      const json = JSON.parse(stdout);
      expect(json.command).toBe('status');
      expect('problems' in json).toBe(false);
      expect(json.summary).toEqual({ total: 2, tested: 1, failing: 0, untested: 1 });
    });
  });
});
