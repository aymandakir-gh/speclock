# Changelog

All notable changes to speclock are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [0.2.0] — 2026-06-16

Second adapter and the start of the road to 1.0.

### Added

- **Jest adapter** (`speclock check --runner jest`). Runs `jest --json` and
  normalizes the report into the same pass/fail/skip result. Because Vitest's
  JSON reporter is Jest-compatible, the pure parser is shared between the two.
- **`examples/jest-demo`** — a real, runnable Jest project gated by speclock,
  used in CI to assert **both** directions: `speclock check` exits `0` when every
  mapped test passes, and non-zero when a mapped test is deleted or made to fail
  (`scripts/verify-example.mjs`, runner-agnostic).
- New self-criterion **SL-10** (the Jest adapter), so `speclock check` now gates
  **10/10** on itself.

### Changed

- Adapter internals refactored into shared helpers — `spawn.ts` (binary
  resolution + timeout-killing spawn), `run-json.ts` (temp-file JSON report
  runner), and `jest-report.ts` (the shared Jest-compatible parser) — so the
  Vitest and Jest adapters are thin and a third adapter is cheap to add.

## [0.1.1] — 2026-06-16

Hardening pass from an adversarial multi-agent review (15 confirmed findings).

### Fixed

- **Safety (high):** `init --spec` and `plan --out` could write outside
  `SPEC.md` / `specs/`, including over a user's source or tests. Write targets
  are now validated against an allowlist (markdown spec; YAML lock under
  `specs/`; never escaping the project) before any write. Codified as a new
  checked criterion, **SL-9** (`speclock check` now gates 9/9 on itself).
- **Parser:** fenced-code detection now tracks the opening fence's char and
  length, so a nested/mismatched fence (e.g. ``` inside ````) no longer drops or
  fabricates criteria. ATX headings keep a trailing `#` that isn't a real closing
  sequence (e.g. "Compile C#").
- **Lock:** `parseLock` trims whitespace-padded ids (so tag matching works),
  rejects future/non-integer lock versions, and rejects non-string descriptions.
- **Checker:** the gate can no longer fail with an empty reason list.
- **Vitest adapter:** a file that fails to load is surfaced as a failing test
  plus a diagnostic note (was silently "no tests reported"); timeouts kill the
  whole process group (no orphaned workers); captured output decodes UTF-8
  across chunk boundaries; stream errors can't crash the process.

### Docs

- README quickstart framed as edited content; the "checks speclock" block is now
  verbatim. CONTRIBUTING `check:self` description corrected (`check:self` /
  `status:self` now build first).

## [0.1.0] — 2026-06-16

First release. The full `init → plan → check → status` loop, with speclock
gating itself in CI.

### Added

- `speclock init` — scaffold a `SPEC.md` template; refuses to overwrite without
  `--force`.
- `speclock plan` — parse `SPEC.md` acceptance criteria into a human-diffable
  `specs/*.yaml` lock; re-running merges (preserves hand-added `tests:` mappings,
  syncs descriptions, drops removed criteria).
- `speclock check` — run the suite via an adapter, map criteria → tests, and exit
  non-zero unless every criterion has a passing test and the suite is green.
- `speclock status` — coverage map (✅ tested / 🚧 failing / ❌ untested);
  informational, never fails the build.
- Pure, I/O-free core (`src/core`): SPEC parser, lock model, resolver, checker,
  formatter — with a meta-test enforcing core purity.
- Pluggable test-runner adapter interface and a Vitest adapter
  (`vitest run --reporter=json`).
- speclock's own spec (`SPEC.md` + `specs/spec.yaml`) and a CI self-gate job:
  `speclock check` passes on speclock itself (8/8 criteria).

### Notes

- Distributed via `npx github:aymandakir-gh/speclock`. The npm name `speclock` is
  taken by an unrelated project; this package is `speclock-cli` (command:
  `speclock`). Registry publish is pending a naming decision — see `PRD.md` §8.

[0.2.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.2.0
[0.1.1]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.1.1
[0.1.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.1.0
