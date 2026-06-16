# speclock — build status

> Living log of where the build is. Updated as milestones land.
> Last updated: 2026-06-16.

## Now

- **Shipped v0.1.0, then hardened to v0.1.1.** All four milestones done; CI
  green incl. the self-gate. An adversarial multi-agent review found 15 real
  issues (2 high-severity write-safety bugs) — all fixed; write safety is now a
  checked criterion (SL-9). `speclock check` gates **9/9** on itself.
- **Open decision for the maintainer:** npm name `speclock` is taken by an
  unrelated adjacent tool → registry publish deferred (see PRD §8). Tool is
  usable today via `npx github:aymandakir-gh/speclock`.

## Milestones

| Milestone | Scope | State |
|-----------|-------|-------|
| M0 Bootstrap | PRD, scaffold, configs, CI, repo, green baseline | ✅ done |
| M1 Core | SPEC parser, criteria model, `init`, `plan`, fixtures | ✅ done |
| M2 check + adapter | resolver, checker, Vitest adapter, `check`, `status`, dogfood green | ✅ done |
| M3 self-gate + demo | CI self-gate job (live & green), demo tape | ✅ done |
| M4 Launch polish | README, CONTRIBUTING, adapter docs, CHANGELOG, release | 🚧 finishing |

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

## Key decisions (see PRD §8)

- Repo built at `~/speclock`, pushed to `github.com/aymandakir-gh/speclock`, MIT.
- Pure `src/core` (no I/O), thin CLI shell, adapters separate.
- Mapping: `[id]` tag in test names (primary) + explicit `tests:` substrings.
- `check` is a CI gate: exits non-zero unless every criterion is ✅.

## Next steps

1. CI green on a clean checkout (M0).
2. `init` + `plan` + fixtures (M1).
3. resolver + checker + Vitest adapter + `check` (M2).
