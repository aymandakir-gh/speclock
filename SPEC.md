# speclock — Spec

speclock's own spec, tracked with speclock. Each criterion below is covered by
tests tagged with its id (e.g. `[SL-2]`). `speclock check` runs the suite and
gates on this file — the project eats its own dog food.

## Overview

A CLI that turns a written spec into machine-checkable acceptance criteria,
maps each criterion to tests, and gates merges on whether those tests exist and
pass. Pure core, thin CLI shell, pluggable test-runner adapters.

## Acceptance Criteria

### SL-1: `speclock init` scaffolds a SPEC.md template

Running `init` writes a SPEC.md template and refuses to overwrite an existing
file unless `--force` is given.

### SL-2: speclock parses a SPEC.md into acceptance criteria

The parser reads `### <id>: <description>` headings under "## Acceptance
Criteria", ignores fenced code, derives ids when absent, and rejects duplicates.

### SL-3: `speclock plan` locks criteria into specs/*.yaml

`plan` writes a YAML lock and, on re-run, preserves hand-added `tests:` mappings
while syncing descriptions and dropping criteria no longer in the spec.

### SL-4: the resolver maps criteria to tests

A criterion is covered by any test whose name contains its `[id]` tag or an
explicit substring from the lock. Coverage state is tested / failing / untested.

### SL-5: `speclock check` gates on the spec

`check` fails (non-zero) unless every criterion maps to at least one passing
test and the suite itself is green.

### SL-6: a Vitest adapter runs the suite

The Vitest adapter runs `vitest run` and normalizes its JSON report into a
runner-agnostic result of pass/fail/skip per test.

### SL-7: `speclock status` prints a coverage map

`status` prints each criterion as ✅ tested / 🚧 failing / ❌ untested with a
summary, without failing the process.

### SL-8: the core is pure

Everything under `src/core` is free of filesystem, child-process, and process
I/O, so the heart of speclock is fully unit-testable.

### SL-9: speclock only writes spec and lock files

Writes are confined to a markdown spec (`init`) and a YAML lock under `specs/`
(`plan`), always inside the project. A stray `--spec`/`--out` can never clobber a
user's source or tests, or escape the project directory.

### SL-10: a Jest adapter runs the suite

The Jest adapter runs `jest --json` and normalizes its (Jest-compatible) report
into the same runner-agnostic pass/fail/skip result, sharing the pure parser
with the Vitest adapter. Selected with `speclock check --runner jest`.

### SL-11: a pytest adapter runs the suite

The pytest adapter runs `pytest --junit-xml` and parses the JUnit XML into the
same runner-agnostic pass/fail/skip result with a small pure parser. Selected
with `speclock check --runner pytest`.

## Out of Scope

- Adapters beyond Vitest/Jest/pytest (`go test` and others ship later; the
  interface is ready).
- Modifying user source or tests (speclock only writes SPEC.md and specs/).
- Network access or telemetry of any kind.
