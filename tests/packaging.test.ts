import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

// Guard the publish config so a refactor can't silently break `npm pack` or the
// `speclock` command name. The end-to-end pack+install is proven by
// scripts/verify-package.mjs (run in CI's `package` job).
interface PackageJson {
  name: string;
  version: string;
  type: string;
  bin: Record<string, string>;
  files: string[];
  engines: { node: string };
  scripts: Record<string, string>;
}

const pkg = JSON.parse(
  readFileSync(fileURLToPath(new URL('../package.json', import.meta.url)), 'utf8'),
) as PackageJson;

describe('package publish config', () => {
  it('[SL-14] is named speclock-cli with a `speclock` bin pointing at the built CLI', () => {
    expect(pkg.name).toBe('speclock-cli');
    expect(pkg.bin.speclock).toBe('dist/cli/index.js');
  });

  it('[SL-14] ships dist and declares a semver version, Node engine, and ESM type', () => {
    expect(pkg.files).toContain('dist');
    expect(pkg.version).toMatch(/^\d+\.\d+\.\d+/);
    expect(pkg.engines.node).toMatch(/>=\s*20/);
    expect(pkg.type).toBe('module');
  });

  it('[SL-14] builds dist via the prepare/prepublishOnly hooks', () => {
    expect(pkg.scripts.prepare).toContain('build');
    expect(pkg.scripts.prepublishOnly).toContain('build');
  });
});
