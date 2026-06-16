#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Command } from 'commander';
import { runInit } from './commands/init.js';
import { runPlan } from './commands/plan.js';
import { runCheckCommand } from './commands/check.js';
import { runStatusCommand } from './commands/status.js';
import { err } from './ui.js';

function readVersion(): string {
  try {
    const pkgUrl = new URL('../../package.json', import.meta.url);
    const pkg = JSON.parse(readFileSync(fileURLToPath(pkgUrl), 'utf8')) as {
      version?: string;
    };
    return pkg.version ?? '0.0.0';
  } catch {
    return '0.0.0';
  }
}

const program = new Command();

program
  .name('speclock')
  .description(
    'Lock the spec, gate the merge. Spec-driven development for the agentic era.',
  )
  .version(readVersion(), '-v, --version', 'print the speclock version')
  .showHelpAfterError('(add --help for usage)');

program
  .command('init')
  .description('Scaffold a SPEC.md template')
  .option('-s, --spec <path>', 'path to the spec file', 'SPEC.md')
  .option('-f, --force', 'overwrite an existing spec file', false)
  .action((opts: { spec: string; force: boolean }) => {
    process.exitCode = runInit({ spec: opts.spec, force: opts.force });
  });

program
  .command('plan')
  .description('Read SPEC.md and lock its acceptance criteria into specs/*.yaml')
  .option('-s, --spec <path>', 'path to the spec file', 'SPEC.md')
  .option('-o, --out <path>', 'path to the lock file to write (default: specs/<spec>.yaml)')
  .action((opts: { spec: string; out?: string }) => {
    process.exitCode = runPlan({ spec: opts.spec, out: opts.out });
  });

program
  .command('check')
  .description('Run the suite and fail unless every criterion maps to a passing test')
  .option('-d, --dir <path>', 'directory of lock files', 'specs')
  .option('-r, --runner <name>', 'test-runner adapter', 'vitest')
  .action(async (opts: { dir: string; runner: string }) => {
    process.exitCode = await runCheckCommand({ dir: opts.dir, runner: opts.runner });
  });

program
  .command('status')
  .description('Print a coverage map of criteria (does not fail the build)')
  .option('-d, --dir <path>', 'directory of lock files', 'specs')
  .option('-r, --runner <name>', 'test-runner adapter', 'vitest')
  .action(async (opts: { dir: string; runner: string }) => {
    process.exitCode = await runStatusCommand({ dir: opts.dir, runner: opts.runner });
  });

program.addHelpText(
  'after',
  `
Workflow:
  speclock init     scaffold SPEC.md
  speclock plan     lock criteria into specs/*.yaml
  speclock check    gate: every criterion must map to a passing test
  speclock status   coverage map of criteria

Docs: https://github.com/aymandakir-gh/speclock`,
);

if (process.argv.length <= 2) {
  program.outputHelp();
  process.exit(0);
}

program.parseAsync(process.argv).catch((e: unknown) => {
  err(e instanceof Error ? e.message : String(e));
  process.exitCode = 1;
});
