// A deliberately mixed suite (one pass, one fail, one skip) used by the Jest
// adapter integration test. NOT part of speclock's own suite — it lives under
// tests/fixtures/, which speclock's vitest config excludes.
describe('sample', () => {
  test('[PASS-1] adds numbers', () => {
    expect(1 + 1).toBe(2);
  });

  test('[FAIL-1] is intentionally failing', () => {
    expect(1).toBe(2);
  });

  test.skip('[SKIP-1] is skipped', () => {
    expect(true).toBe(false);
  });
});
