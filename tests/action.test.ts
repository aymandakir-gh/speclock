import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parse as parseYaml } from 'yaml';

// Validate the reusable composite Action's contract so the bin path / input
// wiring can't drift. speclock's CI dogfoods the action (the `self-gate` job).
interface ActionYml {
  runs: { using: string; steps: Array<{ run?: string }> };
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
    expect(runStep!.run).toContain('inputs.runner');
    expect(runStep!.run).toContain('inputs.dir');
  });
});
