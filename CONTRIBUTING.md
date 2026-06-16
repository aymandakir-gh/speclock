# Contributing to speclock

Thanks for considering a contribution. speclock is small, typed, and tested — and
it gates itself on its own spec, so the bar for "done" is concrete.

## Dev setup

```bash
git clone https://github.com/aymandakir-gh/speclock
cd speclock
pnpm install         # also builds dist via the prepare hook
```

Requires Node ≥ 20 and pnpm 9.

## The loop

```bash
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint (flat config)
pnpm test            # vitest run
pnpm coverage        # vitest run --coverage (gates src/core: ≥90% line, ≥80% branch)
pnpm build           # tsc -> dist/
pnpm check:self      # builds, then runs `speclock check` on speclock itself
```

CI runs all of the above on Node 20 & 22, plus: a `package` job (`npm pack` +
install-from-tarball), the per-adapter `examples` jobs (both directions), and the
self-gate — which runs through speclock's own composite action (`action.yml`).
To prove an example end-to-end locally: `node scripts/verify-example.mjs
examples/jest-demo jest`. Get it green locally before opening a PR.

## How to add a feature (the speclock way)

We dogfood, so features follow the workflow speclock enables:

1. **Add a criterion** to [`SPEC.md`](./SPEC.md) with a new id (e.g. `SL-9`).
2. **Run `pnpm build && node dist/cli/index.js plan`** to sync `specs/spec.yaml`.
3. **Write the test(s)** with the id in the name, e.g. `it('[SL-9] …')`.
4. **Implement** until `pnpm check:self` is green.
5. Keep new logic in `src/core` **pure** (no fs/process/child_process — the
   `[SL-8]` meta-test and an ESLint rule enforce this). Put I/O in `src/cli`,
   and anything that runs a process in `src/adapters`.

## Architecture

```
src/
  core/       pure: spec-parser, lock, resolver, checker, formatter, types
  adapters/   runs test processes: TestRunnerAdapter + vitest/jest/pytest,
              shared helpers (spawn, run-json, jest-report, junit)
  cli/        thin shell: commander, fs I/O, exit codes, terminal colors
tests/
  core/ adapters/ cli/   unit + integration tests (tagged with criterion ids)
  fixtures/              mixed sample projects for adapter integration tests
examples/     vitest-demo / jest-demo / pytest-demo — real projects gated in CI
scripts/      verify-example.mjs (both-direction proof), verify-package.mjs
action.yml    the reusable composite GitHub Action (dogfooded by CI)
```

`tests/fixtures/**` and `examples/**` are standalone projects, excluded from
speclock's own Vitest suite.

- **Pure core, thin shell.** If you're tempted to import `node:fs` in `src/core`,
  it belongs in `src/cli`. Lint will stop you.
- **Honest exit codes.** `check` returns `0` (all green), `1` (criteria
  unmet / suite red), or `2` (usage/config error). Don't blur these.
- **Safe writes.** speclock must never write outside `SPEC.md` and `specs/`.

## Adding a test-runner adapter

See [docs/ADAPTERS.md](./docs/ADAPTERS.md). In short: implement
`TestRunnerAdapter` (run the suite, return a normalized `TestRunResult`), keep the
parsing in a pure exported function so it's unit-testable, and register it in
`src/adapters/index.ts`.

## Commit style

Conventional commits (`feat:`, `fix:`, `docs:`, `chore:`, `test:`, `refactor:`).
Keep the subject imperative and under ~72 chars.

## Code of conduct

Be kind and assume good faith. This is a tool for making collaboration with
machines (and humans) more honest — let's keep the human side that way too.
