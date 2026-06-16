/**
 * Terminal output helpers: stdout/stderr writers and an ANSI palette that
 * respects NO_COLOR and non-TTY output.
 */

import type { Palette } from '../core/formatter.js';

/**
 * Decide whether to emit ANSI color. Per the NO_COLOR spec, the *presence* of
 * NO_COLOR (any value, including an empty string) disables color; TERM=dumb and
 * non-TTY output also disable it. Pure and exported so the decision is testable.
 */
export function shouldEnableColor(env: NodeJS.ProcessEnv, isTTY: boolean): boolean {
  return env.NO_COLOR === undefined && env.TERM !== 'dumb' && isTTY;
}

function wrap(enabled: boolean, open: number, close: number): (s: string) => string {
  return enabled ? (s) => `\x1b[${open}m${s}\x1b[${close}m` : (s) => s;
}

/** Build an ANSI palette, or the identity palette when color is disabled. */
export function buildPalette(enabled: boolean): Palette {
  return {
    green: wrap(enabled, 32, 39),
    red: wrap(enabled, 31, 39),
    yellow: wrap(enabled, 33, 39),
    cyan: wrap(enabled, 36, 39),
    dim: wrap(enabled, 2, 22),
    bold: wrap(enabled, 1, 22),
  };
}

/** ANSI palette for this process (identity functions when color is disabled). */
export const palette: Palette = buildPalette(
  shouldEnableColor(process.env, Boolean(process.stdout.isTTY)),
);

export function out(line = ''): void {
  process.stdout.write(`${line}\n`);
}

export function err(line = ''): void {
  process.stderr.write(`${line}\n`);
}
