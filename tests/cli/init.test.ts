import { describe, it, expect } from 'vitest';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../../src/cli/commands/init.js';

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'speclock-init-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('runInit', () => {
  it('[SL-1] writes a SPEC.md scaffold and returns 0', () => {
    withTempDir((dir) => {
      const spec = join(dir, 'SPEC.md');
      expect(runInit({ spec, force: false })).toBe(0);
      expect(existsSync(spec)).toBe(true);
      expect(readFileSync(spec, 'utf8')).toContain('## Acceptance Criteria');
    });
  });

  it('[SL-1] refuses to overwrite an existing spec without --force', () => {
    withTempDir((dir) => {
      const spec = join(dir, 'SPEC.md');
      runInit({ spec, force: false });
      const before = readFileSync(spec, 'utf8');
      expect(runInit({ spec, force: false })).toBe(1);
      expect(readFileSync(spec, 'utf8')).toBe(before); // untouched
    });
  });

  it('[SL-1] overwrites when --force is given', () => {
    withTempDir((dir) => {
      const spec = join(dir, 'SPEC.md');
      runInit({ spec, force: false });
      expect(runInit({ spec, force: true })).toBe(0);
    });
  });
});
