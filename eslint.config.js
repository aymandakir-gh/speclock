import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage', 'node_modules', 'tests/fixtures', 'examples'],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    // Node ESM helper scripts (build/verify tooling), not part of the package.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        process: 'readonly',
        console: 'readonly',
        URL: 'readonly',
        Buffer: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    // The pure core must contain zero process I/O: no fs, no child_process,
    // no process access, no console. This is enforced here AND by a runtime
    // meta-test so the architecture can't silently rot.
    files: ['src/core/**/*.ts'],
    rules: {
      'no-console': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['fs', 'node:fs', 'fs/*', 'node:fs/*'],
              message:
                'src/core must stay pure: no filesystem access. Do I/O in src/cli or src/adapters.',
            },
            {
              group: ['child_process', 'node:child_process'],
              message:
                'src/core must stay pure: no child_process. Run processes from src/adapters.',
            },
            {
              group: ['process', 'node:process'],
              message: 'src/core must stay pure: no process access.',
            },
          ],
        },
      ],
    },
  },
);
