import { describe, it, expect } from 'vitest';

// A deliberately mixed suite (one pass, one fail, one skip) used by the Vitest
// adapter integration test. NOT part of speclock's own suite — it lives under
// tests/fixtures/, which speclock's vitest config excludes.
describe('sample', () => {
  it('[PASS-1] adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  it('[FAIL-1] is intentionally failing', () => {
    expect(1).toBe(2);
  });

  it.skip('[SKIP-1] is skipped', () => {
    expect(true).toBe(false);
  });
});
