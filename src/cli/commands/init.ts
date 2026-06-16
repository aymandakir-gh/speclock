import { INIT_NEXT_STEPS, SPEC_TEMPLATE } from '../../core/templates.js';
import { fileExists, writeText } from '../io.js';
import { assertSpecPath, assertWritableTarget, UnsafeWriteError } from '../safe-write.js';
import { out, err, palette as c } from '../ui.js';

export interface InitOptions {
  spec: string;
  force: boolean;
  cwd?: string;
}

/** Scaffold a SPEC.md template. Refuses to overwrite without --force, and only
 *  ever writes a markdown spec file inside the project. */
export function runInit(opts: InitOptions): number {
  const cwd = opts.cwd ?? process.cwd();

  let target: string;
  try {
    target = assertSpecPath(opts.spec, cwd);
    assertWritableTarget(target, cwd);
  } catch (e) {
    if (e instanceof UnsafeWriteError) {
      err(c.red(e.message));
      return 2;
    }
    throw e;
  }

  if (fileExists(target) && !opts.force) {
    err(c.yellow(`${opts.spec} already exists.`));
    err(`Refusing to overwrite it. Re-run with ${c.bold('--force')} to replace it.`);
    return 1;
  }

  writeText(target, SPEC_TEMPLATE);

  out(`${c.green('✓')} Wrote ${c.bold(opts.spec)}`);
  out('');
  out(c.dim(INIT_NEXT_STEPS));
  return 0;
}
