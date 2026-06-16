import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runCheckCommand } from '../../src/cli/commands/check.js';
import { runStatusCommand } from '../../src/cli/commands/status.js';
import type { TestRunnerAdapter } from '../../src/adapters/types.js';
import type { TestRunResult } from '../../src/core/types.js';

const LOCK = ['criteria:', '  - id: AC-1', '    description: First', '    tests: []', ''].join('\n');

function fakeAdapter(result: TestRunResult): TestRunnerAdapter {
  return { name: 'fake', run: async () => result };
}

/** A temp project with a lock dir (specs/spec.yaml) holding one criterion. */
function withLockDir(fn: (dir: string) => Promise<void> | void): Promise<void> {
  const dir = mkdtempSync(join(tmpdir(), 'speclock-cmd-'));
  mkdirSync(join(dir, 'specs'));
  writeFileSync(join(dir, 'specs', 'spec.yaml'), LOCK);
  return Promise.resolve(fn(dir)).finally(() => rmSync(dir, { recursive: true, force: true }));
}

/** Run a command, swallowing its stdout/stderr but returning stderr for asserts. */
async function quiet(fn: () => Promise<number>): Promise<{ code: number; stderr: string }> {
  let stderr = '';
  const o = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  const e = vi.spyOn(process.stderr, 'write').mockImplementation((s: string | Uint8Array) => {
    stderr += String(s);
    return true;
  });
  try {
    return { code: await fn(), stderr };
  } finally {
    o.mockRestore();
    e.mockRestore();
  }
}

describe('check exit codes', () => {
  it('[SL-18] exits 0 when every criterion is tested', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({ ok: true, tests: [{ name: '[AC-1] ok', status: 'passed' }] });
      const { code } = await quiet(() => runCheckCommand({ dir: 'specs', runner: 'fake', cwd: dir, adapter }));
      expect(code).toBe(0);
    });
  });

  it('[SL-18] exits 1 when a mapped test fails', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({ ok: false, tests: [{ name: '[AC-1] bad', status: 'failed' }] });
      const { code } = await quiet(() => runCheckCommand({ dir: 'specs', runner: 'fake', cwd: dir, adapter }));
      expect(code).toBe(1);
    });
  });

  it('[SL-18] exits 1 when a criterion has no mapped test', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({ ok: true, tests: [{ name: 'unrelated', status: 'passed' }] });
      const { code } = await quiet(() => runCheckCommand({ dir: 'specs', runner: 'fake', cwd: dir, adapter }));
      expect(code).toBe(1);
    });
  });

  it('[SL-18] exits 2 on a config error (no lock files)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'speclock-cmd-empty-'));
    try {
      const adapter = fakeAdapter({ ok: true, tests: [] });
      const { code } = await quiet(() => runCheckCommand({ dir: 'specs', runner: 'fake', cwd: empty, adapter }));
      expect(code).toBe(2);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});

describe('unknown runner', () => {
  it('[SL-17] rejects an unknown --runner with exit 2 and lists the adapters', async () => {
    await withLockDir(async (dir) => {
      // No injected adapter: this resolves "nope" through the real registry.
      const { code, stderr } = await quiet(() => runCheckCommand({ dir: 'specs', runner: 'nope', cwd: dir }));
      expect(code).toBe(2);
      expect(stderr).toContain('Unknown runner "nope"');
      for (const known of ['vitest', 'jest', 'pytest']) expect(stderr).toContain(known);
    });
  });
});

describe('status never gates', () => {
  it('[SL-20] exits 0 even when a criterion is untested', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({ ok: true, tests: [{ name: 'unrelated', status: 'passed' }] });
      const { code } = await quiet(() => runStatusCommand({ dir: 'specs', runner: 'fake', cwd: dir, adapter }));
      expect(code).toBe(0);
    });
  });

  it('[SL-20] exits 0 even when a mapped test is failing', async () => {
    await withLockDir(async (dir) => {
      const adapter = fakeAdapter({ ok: false, tests: [{ name: '[AC-1] bad', status: 'failed' }] });
      const { code } = await quiet(() => runStatusCommand({ dir: 'specs', runner: 'fake', cwd: dir, adapter }));
      expect(code).toBe(0);
    });
  });

  it('[SL-20] still exits 2 on a config error (status is not a free pass)', async () => {
    const empty = mkdtempSync(join(tmpdir(), 'speclock-cmd-empty2-'));
    try {
      const adapter = fakeAdapter({ ok: true, tests: [] });
      const { code } = await quiet(() => runStatusCommand({ dir: 'specs', runner: 'fake', cwd: empty, adapter }));
      expect(code).toBe(2);
    } finally {
      rmSync(empty, { recursive: true, force: true });
    }
  });
});
