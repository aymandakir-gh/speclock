/**
 * Shared process helpers for test-runner adapters.
 *
 * Adapters live outside the pure core because running a test process is I/O.
 * This module centralizes what every runner needs: locating a local binary,
 * and spawning it with a hard timeout that kills the whole process group (a
 * hung test can spawn workers) while capturing output as UTF-8.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { AdapterError } from './types.js';

export interface SpawnResult {
  code: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

/** Walk up from `startDir` to find a local `node_modules/.bin/<bin>`. */
export function resolveLocalBin(startDir: string, bin: string): string | undefined {
  const binName = process.platform === 'win32' ? `${bin}.cmd` : bin;
  let dir = startDir;
  for (;;) {
    const candidate = join(dir, 'node_modules', '.bin', binName);
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) return undefined;
    dir = parent;
  }
}

/** Kill the runner and its whole process group (a hung test can spawn workers). */
function killTree(child: ReturnType<typeof spawn>): void {
  if (child.pid == null) return;
  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/pid', String(child.pid), '/T', '/F']);
    } catch {
      /* ignore */
    }
    return;
  }
  try {
    // Negative pid targets the detached process group, killing orphaned workers.
    process.kill(-child.pid, 'SIGKILL');
  } catch {
    try {
      child.kill('SIGKILL');
    } catch {
      /* already gone */
    }
  }
}

/**
 * Spawn `command` with `args` in `cwd`, capturing stdout/stderr. Rejects with an
 * `AdapterError` if the process can't start; otherwise resolves once it exits or
 * the timeout fires (the whole process group is killed on timeout).
 */
export function spawnProcess(
  command: string,
  args: string[],
  opts: { cwd: string; timeoutMs: number; label?: string },
): Promise<SpawnResult> {
  const label = opts.label ?? command;
  return new Promise((resolve, reject) => {
    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(command, args, {
        cwd: opts.cwd,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
        // Own process group so a timeout can kill worker processes too.
        detached: process.platform !== 'win32',
      });
    } catch (e) {
      reject(new AdapterError(`Failed to start ${label}: ${e instanceof Error ? e.message : String(e)}`));
      return;
    }

    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      killTree(child);
    }, opts.timeoutMs);
    const settle = (fn: () => void): void => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };

    // setEncoding makes Node buffer partial multibyte sequences across chunks.
    child.stdout?.setEncoding('utf8');
    child.stderr?.setEncoding('utf8');
    child.stdout?.on('data', (d: string) => {
      stdout += d;
    });
    child.stderr?.on('data', (d: string) => {
      stderr += d;
    });
    // Prevent an unhandled stream 'error' from crashing the process; output is
    // best-effort and only used for diagnostics.
    child.stdout?.on('error', () => {});
    child.stderr?.on('error', () => {});
    child.on('error', (e: Error) =>
      settle(() => reject(new AdapterError(`Failed to start ${label}: ${e.message}`))),
    );
    child.on('close', (code) => settle(() => resolve({ code, stdout, stderr, timedOut })));
  });
}
