# speclock — build status

> Living log of where the build is. Updated as milestones land.
> Last updated: 2026-06-16.

## Now

- **M0 Bootstrap** — in progress. PRD committed, scaffold green locally
  (typecheck + lint + test + build + run all pass), creating repo + CI.

## Milestones

| Milestone | Scope | State |
|-----------|-------|-------|
| M0 Bootstrap | PRD, scaffold, configs, CI, repo, green baseline | 🚧 in progress |
| M1 Core | SPEC parser, criteria model, `init`, `plan`, fixtures | ⬜ next |
| M2 check + adapter | resolver, checker, Vitest adapter, `check`, dogfood begins | ⬜ |
| M3 status + self-gate | `status`, `speclock check` green on speclock, CI self-gate | ⬜ |
| M4 Launch polish | README, CONTRIBUTING, adapter docs, release | ⬜ |

## Done

- PRD.md (problem, users, scope/non-goals, milestones, key decisions).
- TypeScript + pnpm scaffold: `package.json`, `tsconfig*.json`, `vitest.config.ts`,
  flat ESLint config (with a rule forbidding fs/child_process/process in `src/core`),
  `.gitignore`, `.nvmrc`, MIT `LICENSE`.
- `src/core/types.ts` — domain model (criteria, lock, coverage, check result).
- `src/core/spec-parser.ts` — SPEC.md → criteria, fence-aware, with warnings and
  hard errors for duplicate/empty criteria. 11 unit tests, all passing.
- `src/cli/index.ts` — commander entry, `--version`/`--help` working.

## Key decisions (see PRD §8)

- Repo built at `~/speclock`, pushed to `github.com/aymandakir-gh/speclock`, MIT.
- Pure `src/core` (no I/O), thin CLI shell, adapters separate.
- Mapping: `[id]` tag in test names (primary) + explicit `tests:` substrings.
- `check` is a CI gate: exits non-zero unless every criterion is ✅.

## Next steps

1. CI green on a clean checkout (M0).
2. `init` + `plan` + fixtures (M1).
3. resolver + checker + Vitest adapter + `check` (M2).
