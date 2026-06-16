import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Fixtures are standalone sample projects exercised by the Vitest adapter.
    // Some contain intentionally-failing tests, so they must never be collected
    // into speclock's own suite.
    exclude: ['tests/fixtures/**', 'node_modules/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**', 'src/adapters/**'],
      reporter: ['text', 'lcov'],
    },
  },
});
