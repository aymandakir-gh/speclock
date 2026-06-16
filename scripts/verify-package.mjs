#!/usr/bin/env node
/**
 * Prove speclock is publish-ready: pack the package with `npm pack`, install the
 * tarball into a throwaway project, and run the `speclock` bin from it.
 *
 *   node scripts/verify-package.mjs
 *
 * This is what `pnpm publish` would ship — it exercises the `prepare` build hook,
 * the `files` allowlist, the `bin` mapping, and the runtime deps end-to-end. It
 * does NOT publish anything.
 */

import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const pkg = JSON.parse(readFileSync(join(repoRoot, 'package.json'), 'utf8'));

function run(cmd, args, cwd) {
  return execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

const failures = [];
function expect(label, cond) {
  console.log(`${cond ? '  ok  ' : 'FAIL  '}${label}`);
  if (!cond) failures.push(label);
}

const packDir = mkdtempSync(join(tmpdir(), 'speclock-pack-'));
const projDir = mkdtempSync(join(tmpdir(), 'speclock-proj-'));

try {
  console.log(`\n# packing ${pkg.name}@${pkg.version} (runs the prepare build)\n`);
  run('npm', ['pack', '--pack-destination', packDir], repoRoot);
  const tgz = readdirSync(packDir).find((f) => f.endsWith('.tgz'));
  expect('npm pack produced a tarball', Boolean(tgz));
  if (!tgz) throw new Error('no tarball produced');
  const tarball = join(packDir, tgz);

  console.log('\n# installing the tarball into a throwaway project\n');
  run('npm', ['init', '-y'], projDir);
  run('npm', ['install', '--no-audit', '--no-fund', tarball], projDir);

  const bin = join(projDir, 'node_modules', '.bin', 'speclock');
  expect('the `speclock` bin is installed', existsSync(bin));

  const version = run(bin, ['--version'], projDir).trim();
  expect(`\`speclock --version\` prints ${pkg.version} (got "${version}")`, version === pkg.version);

  const help = run(bin, ['--help'], projDir);
  expect('`speclock --help` documents the four commands', ['init', 'plan', 'check', 'status'].every((c) => help.includes(c)));

  run(bin, ['init'], projDir);
  expect('`speclock init` scaffolds SPEC.md from the tarball', existsSync(join(projDir, 'SPEC.md')));
} finally {
  rmSync(packDir, { recursive: true, force: true });
  rmSync(projDir, { recursive: true, force: true });
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} packaging check(s) failed: ${failures.join('; ')}`);
  process.exit(1);
}
console.log(`\n✓ ${pkg.name}@${pkg.version} packs, installs, and runs from a tarball`);
