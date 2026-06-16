# Changelog

All notable changes to speclock are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

## [0.5.0] — 2026-06-16

A drop-in CI gate, and proof speclock is publish-ready.

### Added

- **Reusable composite GitHub Action** (`action.yml`): others gate PRs with
  `- uses: aymandakir-gh/speclock@v1` (inputs `runner`/`dir`/`working-directory`/
  `json`). speclock's own CI **dogfoods** it — the self-gate job now runs through
  the action. Copy-paste snippet in the README.
- **Packaging verification** (`scripts/verify-package.mjs` + a CI `package` job):
  `npm pack`, install the tarball into a throwaway project, and run the
  `speclock` bin — proving publish-readiness as `speclock-cli` without
  publishing.
- New self-criteria **SL-14** (publish config) and **SL-15** (the Action);
  `speclock check` gates **15/15** on itself. 103 tests.

## [0.4.0] — 2026-06-16

Machine-readable output for tooling and PR bots.

### Added

- **`speclock check --json` and `speclock status --json`** print one JSON object
  on stdout (versioned via `schemaVersion`) carrying the gate verdict,
  per-criterion coverage, suite info, and (for `check`) problems. Human
  diagnostics stay on stderr and the exit code is unchanged; a config error still
  emits valid JSON (an error object) with exit `2`. Schema documented in
  [`docs/JSON.md`](./docs/JSON.md).
- New self-criteria **SL-12** and **SL-13**; `speclock check` gates **13/13** on
  itself. 98 tests (incl. command-level tests via an injectable in-memory
  adapter).

### Fixed

- `check`/`status` now resolve the lock directory against the working directory
  consistently with where the adapter runs (groundwork for the injectable
  adapter; no change to normal CLI usage).

## [0.3.0] — 2026-06-16

Third adapter — speclock now gates the three runners agent-built projects use most.

### Added

- **pytest adapter** (`speclock check --runner pytest`). Runs
  `pytest --junit-xml` and parses the JUnit XML with a small, dependency-free
  pure parser (`src/adapters/junit.ts`). Override the launcher with the
  `SPECLOCK_PYTEST` env var (e.g. `python -m pytest`).
- **`examples/pytest-demo`** — a real pytest project, mapped via the explicit
  `tests:` substrings (Python names can't carry a `[PY-1]` tag), and
  **`examples/vitest-demo`** — so all three shipped runners have a first-class,
  CI-verified example project.
- New self-criterion **SL-11** (the pytest adapter); `speclock check` gates
  **11/11** on itself. 89 tests.

### Changed

- CI's `examples` job now proves all three adapters (Vitest, Jest, pytest) both
  directions against their `examples/` projects, setting up Python for pytest.

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

[0.5.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.5.0
[0.4.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.4.0
[0.3.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.3.0
[0.2.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.2.0
[0.1.1]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.1.1
[0.1.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.1.0
