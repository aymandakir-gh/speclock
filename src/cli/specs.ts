/**
 * Load and aggregate lock files (specs/*.yaml) for `check` and `status`.
 */

import { parseLock } from '../core/lock.js';
import type { LockCriterion } from '../core/types.js';
import { listLockFiles, readText } from './io.js';

export class SpecLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SpecLoadError';
  }
}

export interface LoadedLocks {
  criteria: LockCriterion[];
  files: string[];
}

/** Read every lock file in `dir`, aggregating criteria. Ids must be unique. */
export function loadLocks(dir: string): LoadedLocks {
  const files = listLockFiles(dir);
  const criteria: LockCriterion[] = [];
  const seenIn = new Map<string, string>();

  for (const file of files) {
    let parsed;
    try {
      parsed = parseLock(readText(file));
    } catch (e) {
      throw new SpecLoadError(
        `${file}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
    for (const c of parsed.criteria) {
      const prev = seenIn.get(c.id);
      if (prev) {
        throw new SpecLoadError(
          `Duplicate criterion id "${c.id}" in ${file} and ${prev}.`,
        );
      }
      seenIn.set(c.id, file);
      criteria.push(c);
    }
  }

  return { criteria, files };
}
