import { basename, extname, join } from 'node:path';
import { parseSpec, SpecParseError } from '../../core/spec-parser.js';
import { mergeLock, parseLock, serializeLock } from '../../core/lock.js';
import type { Lock } from '../../core/types.js';
import { fileExists, readText, writeText } from '../io.js';
import { out, err, palette as c } from '../ui.js';

export interface PlanOptions {
  spec: string;
  out?: string;
}

/** specs/<spec-basename>.yaml, e.g. SPEC.md -> specs/spec.yaml. */
function defaultOutPath(specPath: string): string {
  const base = basename(specPath, extname(specPath)).toLowerCase() || 'spec';
  return join('specs', `${base}.yaml`);
}

/** Read a spec, parse its criteria, and write/merge the lock file. */
export function runPlan(opts: PlanOptions): number {
  const specPath = opts.spec;
  if (!fileExists(specPath)) {
    err(c.red(`${specPath} not found.`));
    err(`Run ${c.bold('speclock init')} to create one.`);
    return 2;
  }

  let parsed;
  try {
    parsed = parseSpec(readText(specPath));
  } catch (e) {
    if (e instanceof SpecParseError) {
      err(c.red(`Could not parse ${specPath}: ${e.message}`));
      return 2;
    }
    throw e;
  }

  for (const w of parsed.warnings) err(c.yellow(`! ${w}`));

  if (parsed.criteria.length === 0) {
    err(c.red('No acceptance criteria found — nothing to lock.'));
    return 2;
  }

  const outPath = opts.out ?? defaultOutPath(specPath);

  let existing: Lock | null = null;
  if (fileExists(outPath)) {
    try {
      existing = parseLock(readText(outPath));
    } catch (e) {
      err(c.red(`Existing lock ${outPath} is invalid: ${e instanceof Error ? e.message : String(e)}`));
      err(`Fix or delete it, then re-run ${c.bold('speclock plan')}.`);
      return 2;
    }
  }

  const result = mergeLock(existing, parsed.criteria, specPath);
  writeText(outPath, serializeLock(result.lock));

  out(
    `${c.green('✓')} Locked ${c.bold(String(result.lock.criteria.length))} criteria → ${c.bold(outPath)}`,
  );
  const parts: string[] = [];
  if (result.added.length) parts.push(c.green(`+${result.added.length} added`));
  if (result.updated.length) parts.push(c.cyan(`~${result.updated.length} updated`));
  if (result.unchanged.length) parts.push(c.dim(`${result.unchanged.length} unchanged`));
  if (parts.length) out(`  ${parts.join('   ')}`);
  if (result.removed.length) {
    err(
      c.yellow(
        `! Dropped ${result.removed.length} criteria no longer in ${specPath}: ${result.removed.join(', ')}`,
      ),
    );
  }
  const firstId = result.lock.criteria[0]?.id ?? 'AC-1';
  out('');
  out(
    c.dim(
      `Next: write tests whose names include each id (e.g. [${firstId}]), then run \`speclock check\`.`,
    ),
  );
  return 0;
}
