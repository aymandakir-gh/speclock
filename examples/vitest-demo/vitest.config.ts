import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

// Standalone config so the Vitest adapter runs this example in isolation.
export default defineConfig({
  test: {
    root: fileURLToPath(new URL('.', import.meta.url)),
    include: ['**/*.test.ts'],
  },
});
