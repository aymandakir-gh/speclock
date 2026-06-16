import { describe, it, expect } from 'vitest';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { runInit } from '../../src/cli/commands/init.js';
import { runPlan } from '../../src/cli/commands/plan.js';

// Regression for review #5: the lexical write guards can be defeated by symlinks.
// init/plan must refuse to write THROUGH a symlinked target or a symlinked parent
// dir, preserving the SL-9 invariant (never clobber source / never escape).
const tmp = (prefix: string): string => mkdtempSync(join(tmpdir(), prefix));

describe('symlink write-safety (SL-9)', () => {
  it('[SL-9] init --force refuses a SPEC.md symlinked to a source file, leaving it untouched', () => {
    const dir = tmp('speclock-syminit-');
    const ext = tmp('speclock-symext-');
    try {
      const victim = join(ext, 'source.ts');
      writeFileSync(victim, 'export const real = 42;\n');
      symlinkSync(victim, join(dir, 'SPEC.md'));
      expect(runInit({ spec: 'SPEC.md', force: true, cwd: dir })).toBe(2);
      expect(readFileSync(victim, 'utf8')).toBe('export const real = 42;\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(ext, { recursive: true, force: true });
    }
  });

  it('[SL-9] plan refuses a default lock symlinked to a source file, leaving it untouched', () => {
    const dir = tmp('speclock-symplan-');
    const ext = tmp('speclock-symext2-');
    try {
      writeFileSync(join(dir, 'SPEC.md'), '## Acceptance Criteria\n### AC-1: x\n');
      const victim = join(ext, 'real.ts');
      writeFileSync(victim, 'export const real = 1;\n');
      mkdirSync(join(dir, 'specs'));
      symlinkSync(victim, join(dir, 'specs', 'spec.yaml'));
      expect(runPlan({ spec: 'SPEC.md', cwd: dir })).toBe(2);
      expect(readFileSync(victim, 'utf8')).toBe('export const real = 1;\n');
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(ext, { recursive: true, force: true });
    }
  });

  it('[SL-9] plan --out refuses to write through a symlinked dir that escapes the project', () => {
    const dir = tmp('speclock-symdir-');
    const ext = tmp('speclock-symextdir-');
    try {
      writeFileSync(join(dir, 'SPEC.md'), '## Acceptance Criteria\n### AC-1: x\n');
      mkdirSync(join(dir, 'specs'));
      symlinkSync(ext, join(dir, 'specs', 'escape')); // specs/escape -> external dir
      expect(runPlan({ spec: 'SPEC.md', out: 'specs/escape/out.yaml', cwd: dir })).toBe(2);
      expect(existsSync(join(ext, 'out.yaml'))).toBe(false);
    } finally {
      rmSync(dir, { recursive: true, force: true });
      rmSync(ext, { recursive: true, force: true });
    }
  });
});
