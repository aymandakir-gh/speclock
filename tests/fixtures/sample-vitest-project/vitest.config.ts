import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Standalone config so the Vitest adapter can run this fixture in isolation
// (speclock's own vitest config excludes tests/fixtures/**).
export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['**/*.test.ts'],
  },
});
