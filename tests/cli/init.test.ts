import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
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
      expect(runInit({ spec: 'SPEC.md', force: false, cwd: dir })).toBe(0);
      const spec = join(dir, 'SPEC.md');
      expect(existsSync(spec)).toBe(true);
      expect(readFileSync(spec, 'utf8')).toContain('## Acceptance Criteria');
    });
  });

  it('[SL-1] refuses to overwrite an existing spec without --force', () => {
    withTempDir((dir) => {
      runInit({ spec: 'SPEC.md', force: false, cwd: dir });
      const spec = join(dir, 'SPEC.md');
      const before = readFileSync(spec, 'utf8');
      expect(runInit({ spec: 'SPEC.md', force: false, cwd: dir })).toBe(1);
      expect(readFileSync(spec, 'utf8')).toBe(before); // untouched
    });
  });

  it('[SL-1] overwrites when --force is given', () => {
    withTempDir((dir) => {
      runInit({ spec: 'SPEC.md', force: false, cwd: dir });
      expect(runInit({ spec: 'SPEC.md', force: true, cwd: dir })).toBe(0);
    });
  });

  it('[SL-9] refuses to write a spec over a source file and leaves it untouched', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, 'src'));
      const src = join(dir, 'src', 'index.ts');
      writeFileSync(src, 'export const real = 42;\n');
      // Even with --force, a non-.md target is rejected (exit 2) and not written.
      expect(runInit({ spec: 'src/index.ts', force: true, cwd: dir })).toBe(2);
      expect(readFileSync(src, 'utf8')).toBe('export const real = 42;\n');
    });
  });
});
