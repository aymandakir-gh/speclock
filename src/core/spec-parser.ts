/**
 * SPEC.md parser — pure.
 *
 * Convention:
 *   - Acceptance criteria live under a level-2 heading whose text is
 *     "Acceptance Criteria" (case-insensitive).
 *   - Each criterion is a level-3 heading inside that section.
 *   - A heading of the form `### <ID>: <description>` uses the explicit ID
 *     (ID matches /^[A-Za-z][A-Za-z0-9._-]*$/). Otherwise the whole heading is
 *     the description and the ID is slugified from it.
 *   - Text under a criterion heading (until the next heading) is its `detail`.
 *   - Fenced code blocks are ignored, so `#` lines inside code don't become
 *     headings.
 */

import type { Criterion, SpecParseResult } from './types.js';

/** Thrown when SPEC.md is structurally invalid (duplicate/empty criteria). */
export class SpecParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecParseError';
  }
}

// ATX heading; a trailing closing `#` run is only stripped when space-preceded
// (per CommonMark), so descriptions like "Compile C#" are preserved.
const HEADING_RE = /^(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/;
// An opening code fence may carry an info string (```ts). A *closing* fence may
// not — only trailing spaces/tabs (CommonMark) — so a content line like ```bash
// inside an open block is NOT a close (which would desync fence tracking).
const FENCE_OPEN_RE = /^\s{0,3}(`{3,}|~{3,})/;
const FENCE_CLOSE_RE = /^\s{0,3}(`{3,}|~{3,})[ \t]*$/;
const EXPLICIT_ID_RE = /^([A-Za-z][A-Za-z0-9._-]*):\s+(.*\S)\s*$/;
// A heading that is just `id:` with nothing after — author forgot the description.
const EMPTY_DESC_ID_RE = /^([A-Za-z][A-Za-z0-9._-]*):\s*$/;
const SECTION_TITLE_RE = /^acceptance\s+criteria$/i;

interface Heading {
  level: number;
  text: string;
  line: number;
}

/** Turn arbitrary heading text into a stable, lowercase, dash-separated id. */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function scanHeadings(lines: string[]): Heading[] {
  const headings: Heading[] = [];
  // Track the opening fence's marker char and length: a fence block closes only
  // on a fence of the same char and length >= the opener (CommonMark). This
  // prevents a shorter/different fence inside a block from desyncing the toggle.
  let inFence = false;
  let fenceChar = '';
  let fenceLen = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] as string;
    if (inFence) {
      // Inside a block, only a closing fence (no info string) of the same char
      // and length >= the opener closes it; anything else is literal content.
      const cm = FENCE_CLOSE_RE.exec(line);
      if (cm) {
        const marker = cm[1]!;
        if (marker[0] === fenceChar && marker.length >= fenceLen) {
          inFence = false;
          fenceChar = '';
          fenceLen = 0;
        }
      }
      continue; // never read a heading from inside a fence
    }
    const om = FENCE_OPEN_RE.exec(line);
    if (om) {
      const marker = om[1]!;
      inFence = true;
      fenceChar = marker[0]!;
      fenceLen = marker.length;
      continue;
    }
    const m = HEADING_RE.exec(line);
    if (m) {
      headings.push({ level: m[1]!.length, text: m[2]!.trim(), line: i });
    }
  }
  return headings;
}

function detailBetween(lines: string[], startLine: number, endLine: number): string {
  return lines
    .slice(startLine + 1, endLine)
    .join('\n')
    .trim();
}

/**
 * Parse a SPEC.md document into acceptance criteria.
 *
 * Never throws for "soft" problems (missing section, no criteria) — those come
 * back as `warnings`. Throws `SpecParseError` only for hard structural errors
 * (duplicate ids, a heading with no description, an underivable id).
 */
export function parseSpec(markdown: string): SpecParseResult {
  // Split the document into lines exactly once and share the array with every
  // helper: it's immutable here, so re-splitting per criterion was pure
  // redundant O(criteria × fileSize) work.
  const lines = markdown.split(/\r?\n/);
  const headings = scanHeadings(lines);
  const warnings: string[] = [];

  const sectionIdx = headings.findIndex(
    (h) => h.level === 2 && SECTION_TITLE_RE.test(h.text),
  );
  if (sectionIdx === -1) {
    return {
      criteria: [],
      warnings: [
        'No "## Acceptance Criteria" section found. Add one and list each criterion as a "### <ID>: <description>" heading.',
      ],
    };
  }

  // Heading lines after the section, up to the next h1/h2 (section boundary).
  const lineCount = lines.length;
  const criteria: Criterion[] = [];
  const seen = new Map<string, string>();
  let autoIdCount = 0;

  for (let i = sectionIdx + 1; i < headings.length; i++) {
    const h = headings[i]!;
    if (h.level <= 2) break; // end of the Acceptance Criteria section
    if (h.level !== 3) continue; // h4+ are detail, not criteria

    let id: string;
    let description: string;
    const explicit = EXPLICIT_ID_RE.exec(h.text);
    if (explicit) {
      id = explicit[1]!;
      description = explicit[2]!.trim();
    } else {
      // `### AC-1:` — an explicit id with an empty description. Reject it rather
      // than silently slugifying "AC-1:" into the id `ac-1` (which would break
      // the author's [AC-1] test tags).
      const emptyDesc = EMPTY_DESC_ID_RE.exec(h.text);
      if (emptyDesc) {
        throw new SpecParseError(
          `Criterion heading on line ${h.line + 1} declares id "${emptyDesc[1]}" but has no description. Write "### ${emptyDesc[1]}: <description>".`,
        );
      }
      description = h.text.trim();
      id = slugify(description);
      autoIdCount++;
    }

    if (!description) {
      throw new SpecParseError(
        `Criterion heading on line ${h.line + 1} has no description.`,
      );
    }
    if (!id) {
      throw new SpecParseError(
        `Could not derive an id for criterion "${h.text}" on line ${h.line + 1}. Add an explicit id, e.g. "### AC-1: ${description}".`,
      );
    }
    if (seen.has(id)) {
      throw new SpecParseError(
        `Duplicate criterion id "${id}" (lines ${seen.get(id)} and ${h.line + 1}). Ids must be unique.`,
      );
    }
    seen.set(id, String(h.line + 1));

    // Detail runs until the next criterion (h3) or the end of the section
    // (an h1/h2), whichever comes first. Deeper headings (h4+) stay in detail.
    let boundaryLine = lineCount;
    for (let j = i + 1; j < headings.length; j++) {
      if (headings[j]!.level <= 3) {
        boundaryLine = headings[j]!.line;
        break;
      }
    }
    const detail = detailBetween(lines, h.line, boundaryLine);

    criteria.push(detail ? { id, description, detail } : { id, description });
  }

  if (criteria.length === 0) {
    warnings.push(
      'The "## Acceptance Criteria" section has no "### ..." criteria headings yet.',
    );
  }
  if (autoIdCount > 0) {
    warnings.push(
      `${autoIdCount} criterion(s) have no explicit id; ids were derived from the description and will change if you reword it. Add an id like "### AC-1: ..." for stable test mappings.`,
    );
  }

  return { criteria, warnings };
}
