import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { assertSpecPath, assertLockPath, UnsafeWriteError } from '../../src/cli/safe-write.js';

const CWD = '/project';

describe('assertSpecPath', () => {
  it('[SL-9] accepts a .md spec inside the project', () => {
    expect(assertSpecPath('SPEC.md', CWD)).toBe(resolve(CWD, 'SPEC.md'));
    expect(assertSpecPath('docs/SPEC.md', CWD)).toBe(resolve(CWD, 'docs/SPEC.md'));
  });

  it('[SL-9] refuses a non-markdown target (e.g. source code)', () => {
    expect(() => assertSpecPath('src/index.ts', CWD)).toThrow(UnsafeWriteError);
    expect(() => assertSpecPath('tests/app.test.ts', CWD)).toThrow(/non-markdown/);
  });

  it('[SL-9] refuses paths that escape the project', () => {
    expect(() => assertSpecPath('../evil.md', CWD)).toThrow(/outside the project/);
    expect(() => assertSpecPath('/etc/passwd.md', CWD)).toThrow(/outside the project/);
  });
});

describe('assertLockPath', () => {
  it('[SL-9] accepts a .yaml/.yml lock under specs/', () => {
    expect(assertLockPath('specs/spec.yaml', CWD)).toBe(resolve(CWD, 'specs/spec.yaml'));
    expect(assertLockPath('specs/nested/a.yml', CWD)).toBe(resolve(CWD, 'specs/nested/a.yml'));
  });

  it('[SL-9] refuses a lock outside specs/', () => {
    expect(() => assertLockPath('spec.yaml', CWD)).toThrow(/outside specs/);
    expect(() => assertLockPath('config/app.yaml', CWD)).toThrow(/outside specs/);
  });

  it('[SL-9] refuses a non-YAML extension', () => {
    expect(() => assertLockPath('specs/spec.txt', CWD)).toThrow(/non-YAML/);
    expect(() => assertLockPath('src/index.ts', CWD)).toThrow(UnsafeWriteError);
  });

  it('[SL-9] refuses traversal and absolute escapes', () => {
    expect(() => assertLockPath('../specs/x.yaml', CWD)).toThrow(/outside the project/);
    expect(() => assertLockPath('/tmp/specs/x.yaml', CWD)).toThrow(/outside the project/);
  });
});
