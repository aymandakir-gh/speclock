# speclock — build status

> Living log of where the build is. Updated as milestones land.
> Last updated: 2026-06-16.

## Now

- **Shipped v1.0.0.** speclock is a drop-in CI gate for **Vitest, Jest, and
  pytest** (each with a real `examples/` project gated both directions in CI),
  with `--json` output, a reusable composite **GitHub Action** (dogfooded by the
  self-gate), and `npm pack` install-from-tarball verification. The self-gate is
  hardened to **21 criteria / 138 tests**; `src/core` coverage is gated at
  ≥90% line / ≥80% branch. A pre-1.0 multi-agent adversarial review raised 12
  findings — all 12 confirmed and fixed, 0 declined (`docs/REVIEW-v1.0.0.md`).
  CI green at every tag v0.2.0 → v1.0.0.
- **Open decision for the maintainer:** npm name `speclock` is taken by an
  unrelated adjacent tool → registry publish deferred (see PRD §8). The package is
  publish-ready as `speclock-cli`; the maintainer pulls the trigger
  (`pnpm publish --access public`). The vhs demo GIF records from
  `demo/speclock.tape` (`vhs demo/speclock.tape`).

## Milestones

| Milestone | Scope | State |
|-----------|-------|-------|
| M0 Bootstrap | PRD, scaffold, configs, CI, repo, green baseline | ✅ done |
| M1 Core | SPEC parser, criteria model, `init`, `plan`, fixtures | ✅ done |
| M2 check + adapter | resolver, checker, Vitest adapter, `check`, `status`, dogfood green | ✅ done |
| M3 self-gate + demo | CI self-gate job (live & green), demo tape | ✅ done |
| M4 Launch polish | README, CONTRIBUTING, adapter docs, CHANGELOG, release | ✅ done |
| M5 `v0.2.0` Jest | shared spawn/parse helper, Jest adapter, `examples/jest-demo`, both-dir CI, SL-10 | ✅ done |
| M6 `v0.3.0` pytest | pytest/JUnit adapter, `examples/pytest-demo` + `vitest-demo`, SL-11 | ✅ done |
| M7 `v0.4.0` JSON | `check/status --json`, stable schema, SL-12/13 | ✅ done |
| M8 `v0.5.0` Action+pkg | composite Action (dogfooded), `npm pack` verify | ✅ done |
| M9 `v1.0.0` harden | 21 criteria, 138 tests, core coverage gate, adversarial review (12/12 fixed) | ✅ done |

## Done

- PRD.md (problem, users, scope/non-goals, milestones, key decisions).
- TypeScript + pnpm scaffold: `package.json`, `tsconfig*.json`, `vitest.config.ts`,
  flat ESLint config (with a rule forbidding fs/child_process/process in `src/core`),
  `.gitignore`, `.nvmrc`, MIT `LICENSE`.
- `src/core/types.ts` — domain model (criteria, lock, coverage, check result).
- `src/core/spec-parser.ts` — SPEC.md → criteria, fence-aware, with warnings and
  hard errors for duplicate/empty criteria. 11 unit tests, all passing.
- `src/cli/index.ts` — commander entry, `--version`/`--help` working.
- **M0:** GitHub repo `aymandakir-gh/speclock` (public, MIT), CI (node 20 & 22)
  green on the first push.
- **M1:** `src/core/lock.ts` (lock model + merge + YAML round-trip, 14 tests),
  `src/core/templates.ts` (SPEC scaffold), `src/cli/io.ts` + `src/cli/ui.ts`,
  `init` and `plan` commands. Verified end-to-end against a temp project: init
  refuses to clobber without --force; plan locks criteria, preserves hand-added
  test mappings on re-plan, updates reworded criteria, and drops removed ones.
  Fixture in `tests/fixtures/sample-spec-project/`. 23 tests passing.
- **M2:** `src/core/resolver.ts` (criteria→tests by tag/substring),
  `src/core/checker.ts` (honest gate), `src/core/formatter.ts` (coverage map),
  `src/adapters/{types,vitest,index}.ts` (adapter interface + Vitest adapter with
  pure `parseVitestReport` + real spawn), `src/cli/{specs,coverage}.ts`,
  `check` + `status` commands. Vitest adapter integration test runs a real suite
  against `tests/fixtures/sample-vitest-project/`. **`speclock check` is green on
  speclock: 8/8 criteria ✅.** Verified the negative path (untested criterion →
  exit 1). 54 tests passing. CI self-gate job enabled.

## Done (post-0.1)

- **M5 `v0.2.0`:** Jest adapter + `examples/jest-demo` (real Jest project) +
  runner-agnostic `scripts/verify-example.mjs` asserting both directions in CI.
  Adapter internals refactored into shared `spawn.ts` / `run-json.ts` /
  `jest-report.ts`. SL-10 added; `speclock check` gates **10/10** on itself; 80
  tests passing.
- **M6 `v0.3.0`:** pytest adapter via `pytest --junit-xml` + a dependency-free
  pure JUnit parser (`src/adapters/junit.ts`); `examples/pytest-demo` (explicit
  `tests:` mapping) and `examples/vitest-demo`, so all three runners have a real,
  CI-verified example. SL-11 added; gates **11/11**; 89 tests.
- **M7 `v0.4.0`:** `check --json` / `status --json` emit a versioned, documented
  JSON object on stdout (diagnostics on stderr, exit codes unchanged); pure
  formatters in `src/core`, command-level tests via an injectable in-memory
  adapter. SL-12/13 added; gates **13/13**; 98 tests. Schema in `docs/JSON.md`.
- **M8 `v0.5.0`:** reusable composite Action (`action.yml`) — the self-gate CI
  job now runs through it (dogfood); `scripts/verify-package.mjs` + a CI
  `package` job pack/install/run the tarball (publish-ready as `speclock-cli`).
  SL-14/15 added; gates **15/15**; 103 tests.
- **M9 `v1.0.0`:** criteria SL-16…SL-21 (lock aggregation, unknown-runner error,
  check exit codes, injectable color, status-never-gates, lock validation);
  `src/core` coverage gated in CI (≥90% line / ≥80% branch); pre-1.0 multi-agent
  adversarial review — 12 findings, all confirmed and fixed with regression
  tests, 0 declined (`docs/REVIEW-v1.0.0.md`); issue/PR templates; README demo +
  examples sections. Gates **21/21**; 138 tests.

## Key decisions (see PRD §8)

- Repo built at `~/speclock`, pushed to `github.com/aymandakir-gh/speclock`, MIT.
- Pure `src/core` (no I/O), thin CLI shell, adapters separate.
- Mapping: `[id]` tag in test names (primary) + explicit `tests:` substrings.
- `check` is a CI gate: exits non-zero unless every criterion is ✅.

## Next steps (road to v1.0.0)

1. M5 `v0.2.0` — Jest adapter + `examples/jest-demo` + both-direction CI (SL-10).
2. M6 `v0.3.0` — pytest adapter + `examples/pytest-demo` (+ `vitest-demo`) (SL-11).
3. M7 `v0.4.0` — `check/status --json` with a stable schema (SL-12/13).
4. M8 `v0.5.0` — reusable composite Action (dogfooded) + `npm pack` verify.
5. M9 `v1.0.0` — ≥20 criteria, ≥120 tests, core coverage gate, adversarial review.
