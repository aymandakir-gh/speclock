import { INIT_NEXT_STEPS, SPEC_TEMPLATE } from '../../core/templates.js';
import { fileExists, writeText } from '../io.js';
import { out, err, palette as c } from '../ui.js';

export interface InitOptions {
  spec: string;
  force: boolean;
}

/** Scaffold a SPEC.md template. Refuses to overwrite without --force. */
export function runInit(opts: InitOptions): number {
  const target = opts.spec;

  if (fileExists(target) && !opts.force) {
    err(c.yellow(`${target} already exists.`));
    err(`Refusing to overwrite it. Re-run with ${c.bold('--force')} to replace it.`);
    return 1;
  }

  writeText(target, SPEC_TEMPLATE);

  out(`${c.green('✓')} Wrote ${c.bold(target)}`);
  out('');
  out(c.dim(INIT_NEXT_STEPS));
  return 0;
}
