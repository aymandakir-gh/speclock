import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Fixtures and examples are standalone sample projects exercised by the
    // adapters. Some contain intentionally-failing tests, so they must never be
    // collected into speclock's own suite.
    exclude: ['tests/fixtures/**', 'examples/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/adapters/**'],
      reporter: ['text', 'lcov'],
      // Gate the pure core hard: it's the heart of speclock and fully
      // unit-testable. Adapters are additionally proven by the example projects
      // in CI, so they're reported but not threshold-gated here.
      thresholds: {
        'src/core/**': { lines: 90, branches: 80, functions: 90, statements: 90 },
      },
    },
  },
});
