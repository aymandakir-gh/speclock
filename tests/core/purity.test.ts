import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

// Meta-test: the pure core must contain zero process I/O. This guards the
// architecture at runtime, complementing the ESLint rule in eslint.config.js.
const coreDir = fileURLToPath(new URL('../../src/core/', import.meta.url));

function coreFiles(): string[] {
  return readdirSync(coreDir)
    .filter((f) => f.endsWith('.ts'))
    .map((f) => join(coreDir, f));
}

describe('src/core purity', () => {
  it('[SL-8] imports no filesystem/child_process/process modules', () => {
    const forbidden = /\bfrom\s+['"](node:)?(fs|child_process|process)(\/[^'"]*)?['"]/;
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8');
      expect(forbidden.test(src), `${file} imports a forbidden module`).toBe(false);
    }
  });

  it('[SL-8] does not reference process or console', () => {
    for (const file of coreFiles()) {
      const src = readFileSync(file, 'utf8');
      expect(/\bprocess\./.test(src), `${file} references process`).toBe(false);
      expect(/\bconsole\./.test(src), `${file} references console`).toBe(false);
    }
  });

  it('[SL-8] finds the core modules (sanity)', () => {
    expect(coreFiles().length).toBeGreaterThanOrEqual(5);
  });
});
