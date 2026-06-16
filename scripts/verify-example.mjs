#!/usr/bin/env node
/**
 * Prove a speclock adapter end-to-end against a real example project, in BOTH
 * directions required of a CI gate:
 *
 *   1. positive    — `speclock check` exits 0 when every mapped test passes.
 *   2. made-to-fail — a mapped test forced to fail makes it exit non-zero.
 *   3. deleted      — removing the mapped test(s) makes it exit non-zero.
 *
 * Usage:  node scripts/verify-example.mjs <exampleDir> <runner>
 *
 * The script mutates the example only transiently and always restores it
 * (even on error). It operates only on speclock's own example fixtures.
 */

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, renameSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const speclock = join(repoRoot, 'dist', 'cli', 'index.js');

const [, , exampleArg, runner] = process.argv;
if (!exampleArg || !runner) {
  console.error('usage: node scripts/verify-example.mjs <exampleDir> <runner>');
  process.exit(2);
}
const exampleDir = resolve(repoRoot, exampleArg);

const RUNNERS = {
  vitest: {
    testRe: /\.test\.ts$/,
    failFile: '__speclock_break.test.ts',
    failBody: (tag) =>
      `import { test, expect } from 'vitest';\ntest('${tag} speclock forced failure', () => { expect(1).toBe(2); });\n`,
  },
  jest: {
    testRe: /\.test\.js$/,
    failFile: '__speclock_break.test.js',
    failBody: (tag) => `test('${tag} speclock forced failure', () => { expect(1).toBe(2); });\n`,
  },
  pytest: {
    testRe: /(^test_.*|_test)\.py$/,
    failFile: 'test_speclock_break.py',
    // pytest maps by explicit substrings, so a forced failure relies on the
    // suite-is-red gate rather than a per-criterion tag.
    failBody: () => `def test_speclock_forced_failure():\n    assert False\n`,
  },
};

const cfg = RUNNERS[runner];
if (!cfg) {
  console.error(`unknown runner "${runner}" (have: ${Object.keys(RUNNERS).join(', ')})`);
  process.exit(2);
}

if (!existsSync(speclock)) {
  console.error(`speclock is not built: ${speclock} missing. Run \`pnpm build\` first.`);
  process.exit(2);
}

/** Run `speclock check` in the example; return its exit code (0 on success). */
function check() {
  try {
    execFileSync(process.execPath, [speclock, 'check', '--runner', runner], {
      cwd: exampleDir,
      stdio: 'inherit',
    });
    return 0;
  } catch (e) {
    return typeof e.status === 'number' ? e.status : 1;
  }
}

/** All test files in the example (recursive), skipping node_modules/specs. */
function findTestFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === 'specs' || entry === '.git') continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...findTestFiles(full));
    else if (cfg.testRe.test(entry)) out.push(full);
  }
  return out;
}

function firstCriterionTag() {
  const lock = join(exampleDir, 'specs', 'spec.yaml');
  const m = existsSync(lock) ? readFileSync(lock, 'utf8').match(/^\s*-\s*id:\s*(.+?)\s*$/m) : null;
  return m ? `[${m[1]}]` : '';
}

const failures = [];
function expect(label, cond) {
  console.log(`${cond ? '  ok  ' : 'FAIL  '}${label}`);
  if (!cond) failures.push(label);
}

console.log(`\n# verifying ${runner} adapter against ${exampleArg}\n`);

// 1. positive
console.log('--- direction 1: all mapped tests pass → exit 0');
expect('positive: check exits 0', check() === 0);

// 2. a mapped test made to fail → non-zero
console.log('\n--- direction 2: a mapped test made to fail → exit non-zero');
const failPath = join(exampleDir, cfg.failFile);
try {
  writeFileSync(failPath, cfg.failBody(firstCriterionTag()));
  // Must be exactly the gate-failure code (1), not an adapter/config error (2):
  // a crash that happens to exit non-zero would otherwise pass this hollowly.
  expect('made-to-fail: check exits 1 (the gate)', check() === 1);
} finally {
  rmSync(failPath, { force: true });
}

// 3. mapped test(s) deleted → non-zero
console.log('\n--- direction 3: mapped test(s) deleted → exit non-zero');
const testFiles = findTestFiles(exampleDir);
expect('found at least one test file to delete', testFiles.length > 0);
const moved = [];
try {
  for (const f of testFiles) {
    const bak = `${f}.speclock-bak`;
    renameSync(f, bak);
    moved.push([f, bak]);
  }
  expect('deleted: check exits 1 (criteria untested)', check() === 1);
} finally {
  for (const [orig, bak] of moved) renameSync(bak, orig);
}

// restore sanity: green again
console.log('\n--- restore sanity: check exits 0 again');
expect('restored: check exits 0', check() === 0);

if (failures.length) {
  console.error(`\n✗ ${failures.length} verification(s) failed for ${runner}: ${failures.join('; ')}`);
  process.exit(1);
}
console.log(`\n✓ ${runner} adapter verified both directions against ${exampleArg}`);
