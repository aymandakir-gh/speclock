import { describe, it, expect } from 'vitest';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadLocks, SpecLoadError } from '../../src/cli/specs.js';

function withDir(fn: (dir: string) => void): void {
  const dir = mkdtempSync(join(tmpdir(), 'speclock-locks-'));
  try {
    fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

describe('loadLocks', () => {
  it('[SL-16] aggregates criteria across multiple .yaml/.yml lock files', () => {
    withDir((dir) => {
      writeFileSync(join(dir, 'a.yaml'), 'criteria:\n  - id: A-1\n    description: a\n');
      writeFileSync(join(dir, 'b.yml'), 'criteria:\n  - id: B-1\n    description: b\n');
      const { criteria, files } = loadLocks(dir);
      expect(criteria.map((c) => c.id).sort()).toEqual(['A-1', 'B-1']);
      expect(files).toHaveLength(2);
    });
  });

  it('[SL-16] rejects a criterion id duplicated across files', () => {
    withDir((dir) => {
      writeFileSync(join(dir, 'a.yaml'), 'criteria:\n  - id: DUP\n    description: a\n');
      writeFileSync(join(dir, 'b.yaml'), 'criteria:\n  - id: DUP\n    description: b\n');
      expect(() => loadLocks(dir)).toThrow(SpecLoadError);
      expect(() => loadLocks(dir)).toThrow(/Duplicate criterion id "DUP"/);
    });
  });

  it('[SL-16] returns empty when the directory has no lock files', () => {
    withDir((dir) => {
      expect(loadLocks(dir)).toEqual({ criteria: [], files: [] });
    });
  });

  it('[SL-16] surfaces an invalid lock file with its path', () => {
    withDir((dir) => {
      writeFileSync(join(dir, 'bad.yaml'), 'criteria:\n  - description: no id\n');
      expect(() => loadLocks(dir)).toThrow(/bad\.yaml/);
    });
  });
});
