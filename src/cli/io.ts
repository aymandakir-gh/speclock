/**
 * Filesystem helpers for the CLI layer. The pure core never imports this.
 *
 * speclock is read-only on user code. The only writers are `init` (SPEC.md) and
 * `plan` (specs/*.yaml); `writeText` is the single choke point for writes.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'node:fs';
import { dirname, extname, join } from 'node:path';

export function fileExists(path: string): boolean {
  return existsSync(path);
}

export function readText(path: string): string {
  return readFileSync(path, 'utf8');
}

/** Write text, creating parent directories as needed. */
export function writeText(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content, 'utf8');
}

/** List *.yaml / *.yml files in a directory (sorted). Empty if dir is absent. */
export function listLockFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => ['.yaml', '.yml'].includes(extname(f).toLowerCase()))
    .sort()
    .map((f) => join(dir, f));
}
