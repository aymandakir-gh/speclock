/**
 * Output formatting — pure. Renders reports to strings. Color is injected via a
 * Palette so the core stays free of TTY/process concerns; the CLI passes a real
 * ANSI palette, tests pass the identity palette.
 */

export interface Palette {
  green(s: string): string;
  red(s: string): string;
  yellow(s: string): string;
  cyan(s: string): string;
  dim(s: string): string;
  bold(s: string): string;
}

/** No-op palette: every function returns its input unchanged. */
export const plainPalette: Palette = {
  green: (s) => s,
  red: (s) => s,
  yellow: (s) => s,
  cyan: (s) => s,
  dim: (s) => s,
  bold: (s) => s,
};
