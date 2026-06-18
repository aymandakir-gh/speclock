import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runPlan } from '../../src/cli/commands/plan.js';
import { parseLock } from '../../src/core/lock.js';

const SPEC = [
  '## Acceptance Criteria',
  '',
  '### AC-1: First criterion',
  '### AC-2: Second criterion',
  '',
].join('\n');

function withTempDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'speclock-plan-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('runPlan', () => {
  it('[SL-3] writes specs/spec.yaml from SPEC.md and returns 0', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'SPEC.md'), SPEC);
      expect(runPlan({ spec: 'SPEC.md', cwd: dir })).toBe(0);
      const lockPath = join(dir, 'specs', 'spec.yaml');
      expect(existsSync(lockPath)).toBe(true);
      const lock = parseLock(readFileSync(lockPath, 'utf8'));
      expect(lock.criteria.map((c) => c.id)).toEqual(['AC-1', 'AC-2']);
    });
  });

  it('[SL-9] refuses --out outside specs/ and writes nothing there', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'SPEC.md'), SPEC);
      mkdirSync(join(dir, 'app'));
      const victim = join(dir, 'app', 'config.yaml');
      writeFileSync(victim, 'secret: do-not-touch\n');
      expect(runPlan({ spec: 'SPEC.md', out: 'app/config.yaml', cwd: dir })).toBe(2);
      expect(readFileSync(victim, 'utf8')).toBe('secret: do-not-touch\n');
    });
  });

  it('[SL-9] refuses --out that escapes the project', () => {
    withTempDir((dir) => {
      writeFileSync(join(dir, 'SPEC.md'), SPEC);
      expect(runPlan({ spec: 'SPEC.md', out: '../escape.yaml', cwd: dir })).toBe(2);
      expect(existsSync(join(dir, '..', 'escape.yaml'))).toBe(false);
    });
  });

  it('refuses to clobber a lock generated from a different spec sharing a basename', () => {
    withTempDir((dir) => {
      mkdirSync(join(dir, 'auth'));
      mkdirSync(join(dir, 'billing'));
      writeFileSync(join(dir, 'auth', 'login.md'), SPEC);
      writeFileSync(join(dir, 'billing', 'login.md'), SPEC);

      // First spec locks specs/login.yaml (default path derived from basename).
      expect(runPlan({ spec: 'auth/login.md', cwd: dir })).toBe(0);
      const lockPath = join(dir, 'specs', 'login.yaml');
      const before = readFileSync(lockPath, 'utf8');
      expect(parseLock(before).spec).toBe('auth/login.md');

      // Second spec shares the basename → default path collides → refused, the
      // first lock is left byte-for-byte untouched (no silent overwrite/merge).
      expect(runPlan({ spec: 'billing/login.md', cwd: dir })).toBe(2);
      expect(readFileSync(lockPath, 'utf8')).toBe(before);

      // An explicit --out lets the colliding spec coexist.
      expect(
        runPlan({ spec: 'billing/login.md', out: 'specs/billing-login.yaml', cwd: dir }),
      ).toBe(0);
      expect(existsSync(join(dir, 'specs', 'billing-login.yaml'))).toBe(true);
    });
  });
});
