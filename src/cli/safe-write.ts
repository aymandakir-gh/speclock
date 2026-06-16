/**
 * Write-path guards. speclock's hard invariant: it only ever writes a spec file
 * (`init`) or a lock file under `specs/` (`plan`), always within the project,
 * and never to a user's source or tests. These guards enforce that before any
 * write happens, so a stray `--spec`/`--out` can't clobber arbitrary files.
 */

import { existsSync, lstatSync, realpathSync } from 'node:fs';
import { basename, dirname, extname, isAbsolute, relative, resolve, sep } from 'node:path';

export class UnsafeWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UnsafeWriteError';
  }
}

/** Resolve `target` and ensure it stays within `cwd` (no `..`/absolute escape). */
function resolveWithin(target: string, cwd: string): { abs: string; rel: string } {
  const root = resolve(cwd);
  const abs = resolve(root, target);
  const rel = relative(root, abs);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new UnsafeWriteError(
      `Refusing to write outside the project: ${target}. Paths must stay inside ${root}.`,
    );
  }
  return { abs, rel };
}

/** Validate an `init` target: a markdown spec file inside the project. */
export function assertSpecPath(target: string, cwd: string): string {
  const { abs, rel } = resolveWithin(target, cwd);
  if (extname(abs).toLowerCase() !== '.md') {
    throw new UnsafeWriteError(
      `Refusing to write a spec to a non-markdown file: ${rel}. The spec must be a .md file (speclock never writes to source or tests).`,
    );
  }
  return abs;
}

/** Validate a `plan` output: a YAML lock file under specs/ inside the project. */
export function assertLockPath(target: string, cwd: string): string {
  const { abs, rel } = resolveWithin(target, cwd);
  const ext = extname(abs).toLowerCase();
  if (ext !== '.yaml' && ext !== '.yml') {
    throw new UnsafeWriteError(
      `Refusing to write a lock to a non-YAML file: ${rel}. The lock must be a .yaml/.yml file.`,
    );
  }
  if (rel.split(sep)[0] !== 'specs') {
    throw new UnsafeWriteError(
      `Refusing to write a lock outside specs/: ${rel}. The lock must live under the specs/ directory.`,
    );
  }
  return abs;
}

/**
 * Filesystem-level guard against symlink escapes, run just before a write. The
 * lexical `assert*` checks above can be defeated by symlinks (a `SPEC.md` or a
 * `specs/` entry that points elsewhere). This refuses to write *through* a
 * symlinked final component, and canonicalizes the nearest existing ancestor so
 * a symlinked parent dir can't redirect the write outside the project (or, for
 * a lock, outside `specs/`).
 */
export function assertWritableTarget(
  absTarget: string,
  cwd: string,
  opts: { underSpecs?: boolean } = {},
): void {
  // The final component must not itself be a symlink — don't write through it.
  try {
    if (lstatSync(absTarget).isSymbolicLink()) {
      throw new UnsafeWriteError(
        `Refusing to write through a symlink: ${absTarget}. speclock writes regular files only.`,
      );
    }
  } catch (e) {
    if (e instanceof UnsafeWriteError) throw e;
    // Otherwise the target doesn't exist yet (ENOENT) — fine; check the ancestor.
  }

  const projectReal = realpathSync(resolve(cwd));

  // Walk up to the nearest existing ancestor, canonicalize it, then re-attach
  // the not-yet-created tail, so a symlinked directory is resolved to its target.
  const tail: string[] = [];
  let dir = dirname(absTarget);
  while (!existsSync(dir)) {
    tail.unshift(basename(dir));
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  const canonicalTarget = resolve(realpathSync(dir), ...tail, basename(absTarget));

  const rel = relative(projectReal, canonicalTarget);
  if (rel === '' || rel.startsWith('..') || isAbsolute(rel)) {
    throw new UnsafeWriteError(
      `Refusing to write outside the project (resolved through symlinks): ${absTarget}.`,
    );
  }
  if (opts.underSpecs && rel.split(sep)[0] !== 'specs') {
    throw new UnsafeWriteError(
      `Refusing to write a lock outside specs/ (resolved through symlinks): ${rel}.`,
    );
  }
}
