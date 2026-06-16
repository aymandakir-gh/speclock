import { describe, it, expect } from 'vitest';
import { shouldEnableColor, buildPalette } from '../../src/cli/ui.js';

// Covers the "disables cleanly (NO_COLOR / non-TTY) and ANSI when on" half of
// SL-19 — the env/TTY decision in src/cli/ui.ts, not just the formatter seam.
// Regressions for review #7 (NO_COLOR="") and #8 (decision was untested).
describe('shouldEnableColor', () => {
  it('[SL-19] enables color only on a TTY with no NO_COLOR and a non-dumb TERM', () => {
    expect(shouldEnableColor({}, true)).toBe(true);
    expect(shouldEnableColor({ TERM: 'xterm-256color' }, true)).toBe(true);
  });

  it('[SL-19] disables color when output is not a TTY', () => {
    expect(shouldEnableColor({}, false)).toBe(false);
  });

  it('[SL-19] disables color whenever NO_COLOR is present — including empty string', () => {
    expect(shouldEnableColor({ NO_COLOR: '1' }, true)).toBe(false);
    expect(shouldEnableColor({ NO_COLOR: '' }, true)).toBe(false); // the review #7 bug
  });

  it('[SL-19] disables color for a dumb terminal', () => {
    expect(shouldEnableColor({ TERM: 'dumb' }, true)).toBe(false);
  });
});

describe('buildPalette', () => {
  it('[SL-19] wraps text in ANSI codes when enabled', () => {
    const p = buildPalette(true);
    expect(p.green('x')).toBe('\x1b[32mx\x1b[39m');
    expect(p.red('x')).toContain('\x1b[31m');
  });

  it('[SL-19] is the identity (no ANSI) when disabled', () => {
    const p = buildPalette(false);
    expect(p.green('x')).toBe('x');
    expect(p.red('x')).toBe('x');
    expect(p.bold('x')).toBe('x');
  });
});
