/**
 * Terminal output helpers: stdout/stderr writers and an ANSI palette that
 * respects NO_COLOR and non-TTY output.
 */

import type { Palette } from '../core/formatter.js';

const colorEnabled =
  process.env.NO_COLOR == null &&
  process.env.TERM !== 'dumb' &&
  Boolean(process.stdout.isTTY);

function wrap(open: number, close: number): (s: string) => string {
  if (!colorEnabled) return (s) => s;
  return (s) => `[${open}m${s}[${close}m`;
}

/** ANSI palette (identity functions when color is disabled). */
export const palette: Palette = {
  green: wrap(32, 39),
  red: wrap(31, 39),
  yellow: wrap(33, 39),
  cyan: wrap(36, 39),
  dim: wrap(2, 22),
  bold: wrap(1, 22),
};

export function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

export function err(line = ''): void {
  process.stderr.write(`${line}\n`);
}
