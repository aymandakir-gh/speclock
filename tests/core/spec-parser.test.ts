import { describe, it, expect } from 'vitest';
import { parseSpec, slugify, SpecParseError } from '../../src/core/spec-parser.js';

describe('parseSpec', () => {
  it('[SL-2] extracts criteria with explicit ids and descriptions', () => {
    const md = [
      '# My Project',
      '',
      '## Acceptance Criteria',
      '',
      '### AC-1: User can log in',
      'They enter email and password.',
      '',
      '### AC-2: User can log out',
      '',
    ].join('\n');

    const { criteria, warnings } = parseSpec(md);
    expect(criteria).toEqual([
      { id: 'AC-1', description: 'User can log in', detail: 'They enter email and password.' },
      { id: 'AC-2', description: 'User can log out' },
    ]);
    expect(warnings).toEqual([]);
  });

  it('[SL-2] derives a slug id when none is given and warns', () => {
    const md = ['## Acceptance Criteria', '', '### User can reset a password', ''].join('\n');
    const { criteria, warnings } = parseSpec(md);
    expect(criteria).toEqual([{ id: 'user-can-reset-a-password', description: 'User can reset a password' }]);
    expect(warnings.some((w) => w.includes('no explicit id'))).toBe(true);
  });

  it('[SL-2] ignores headings inside fenced code blocks', () => {
    const md = [
      '## Acceptance Criteria',
      '',
      '### AC-1: Render markdown',
      '',
      '```md',
      '### This is not a criterion',
      '## Neither is this',
      '```',
      '',
      'Real detail after the fence.',
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria).toHaveLength(1);
    expect(criteria[0]!.id).toBe('AC-1');
    expect(criteria[0]!.detail).toContain('Real detail after the fence.');
    expect(criteria[0]!.detail).toContain('### This is not a criterion');
  });

  it('[SL-2] stops collecting at the next level-2 section', () => {
    const md = [
      '## Acceptance Criteria',
      '### AC-1: First',
      '## Out of Scope',
      '### Not a criterion',
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria.map((c) => c.id)).toEqual(['AC-1']);
  });

  it('[SL-2] treats h4+ as detail, not criteria', () => {
    const md = [
      '## Acceptance Criteria',
      '### AC-1: Parent criterion',
      '#### A sub-heading in the detail',
      'body',
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria).toHaveLength(1);
    expect(criteria[0]!.detail).toContain('#### A sub-heading in the detail');
  });

  it('[SL-2] warns (does not throw) when the section is missing', () => {
    const { criteria, warnings } = parseSpec('# Title\n\nSome prose.\n');
    expect(criteria).toEqual([]);
    expect(warnings[0]).toContain('No "## Acceptance Criteria" section found');
  });

  it('[SL-2] warns when the section exists but is empty', () => {
    const { criteria, warnings } = parseSpec('## Acceptance Criteria\n\nComing soon.\n');
    expect(criteria).toEqual([]);
    expect(warnings.some((w) => w.includes('no "### ..." criteria'))).toBe(true);
  });

  it('[SL-2] throws on duplicate ids', () => {
    const md = ['## Acceptance Criteria', '### AC-1: One', '### AC-1: Two', ''].join('\n');
    expect(() => parseSpec(md)).toThrow(SpecParseError);
    expect(() => parseSpec(md)).toThrow(/Duplicate criterion id "AC-1"/);
  });

  it('[SL-2] throws on an explicit-id heading with no description (### AC-1:)', () => {
    // Must NOT silently slugify "AC-1:" into the id `ac-1` (regression: review #2).
    expect(() => parseSpec('## Acceptance Criteria\n### AC-1:\n')).toThrow(SpecParseError);
    expect(() => parseSpec('## Acceptance Criteria\n### AC-1:   \n')).toThrow(/no description/);
  });

  it('[SL-2] only reads a leading "token:" as an id, else slugifies the whole heading', () => {
    const md = [
      '## Acceptance Criteria',
      '### AC-1: Supports UTF-8: emojis, accents', // leading AC-1: -> id, rest (incl. colon) is description
      '### Supports UTF-8 fully', // no leading token-colon -> slugified
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria[0]!.id).toBe('AC-1');
    expect(criteria[0]!.description).toBe('Supports UTF-8: emojis, accents');
    expect(criteria[1]!.id).toBe('supports-utf-8-fully');
  });

  it('[SL-2] matches the section heading case-insensitively', () => {
    const md = ['## ACCEPTANCE CRITERIA', '### AC-1: Works', ''].join('\n');
    expect(parseSpec(md).criteria).toHaveLength(1);
  });
});

describe('slugify', () => {
  it('[SL-2] lowercases, dashes, and trims', () => {
    expect(slugify('Hello, World!')).toBe('hello-world');
    expect(slugify('  Trim   me  ')).toBe('trim-me');
    expect(slugify('A/B testing & more')).toBe('a-b-testing-more');
  });
});

describe('parseSpec fenced-code edge cases', () => {
  it('[SL-2] a shorter ``` fence inside a ```` block does not desync', () => {
    const md = [
      '## Acceptance Criteria',
      '### AC-1: Show a fenced block in docs',
      '````markdown',
      '```',
      '### Not a criterion',
      '```',
      '````',
      '### AC-2: After the nested block',
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria.map((c) => c.id)).toEqual(['AC-1', 'AC-2']);
  });

  it('[SL-2] a content line that looks like a fence-with-info-string does not desync (no dropped criterion)', () => {
    // ```bash inside an open ```ts block is content, not a close (a closing fence
    // carries no info string). Regression for review #1 — a false-green vector
    // where a real criterion was dropped and a fenced one fabricated.
    const md = [
      '## Acceptance Criteria',
      '### AC-1: real',
      '```ts',
      '### hidden in code',
      '```bash',
      '### also-hidden',
      '```',
      '### AC-2: real',
      '',
    ].join('\n');
    expect(parseSpec(md).criteria.map((c) => c.id)).toEqual(['AC-1', 'AC-2']);
  });

  it('[SL-2] a ~~~ line inside a ``` block is literal content', () => {
    const md = [
      '## Acceptance Criteria',
      '### AC-1: Mixed fences',
      '```',
      '~~~',
      '### Not a criterion',
      '```',
      '### AC-2: Still here',
      '',
    ].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria.map((c) => c.id)).toEqual(['AC-1', 'AC-2']);
  });
});

describe('parseSpec ATX trailing #', () => {
  it('[SL-2] keeps a trailing # when not space-preceded (e.g. C#)', () => {
    const md = ['## Acceptance Criteria', '### AC-1: Compile C#', ''].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria[0]!.description).toBe('Compile C#');
  });

  it('[SL-2] still strips a space-preceded ATX closing sequence', () => {
    const md = ['## Acceptance Criteria', '### AC-1: Done ###', ''].join('\n');
    const { criteria } = parseSpec(md);
    expect(criteria[0]!.description).toBe('Done');
  });
});
