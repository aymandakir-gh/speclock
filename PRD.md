# speclock — Product Requirements Document

> Status: living document. Decisions are encoded here and in commits for later review.
> Last updated: 2026-06-16 (M0 — bootstrap).

## 1. Problem

Agents now write code faster than humans can review it. The dominant failure mode
is no longer "the code doesn't compile" — it's **plausible-looking code that meets
no agreed-upon spec.** A diff looks reasonable, the tests it ships are the tests it
wanted to pass, and nobody verified the change against the intent that triggered it.

This is "vibe-coding": shipping on the *feeling* that the code is right rather than
on an enforceable contract. It scales badly. The more code an agent writes, the more
surface area a human supervisor has to eyeball, and the easier it is for scope to
drift silently away from what was actually asked for.

**speclock turns intent into an enforceable, machine-checkable contract.** You write
a spec, lock it into acceptance criteria, point each criterion at the test(s) that
prove it, and gate merges on the spec — not on vibes.

## 2. Users

- **Primary: humans supervising coding agents.** Tech leads, senior engineers, and
  solo builders who delegate implementation to agents and need a cheap, automatic way
  to confirm the result matches the brief.
- **Secondary: the coding agents themselves.** speclock gives an agent an unambiguous
  target ("make `speclock check` pass") and a self-serve way to know when it's done.
- **Tertiary: CI / reviewers.** `speclock check` is a single non-zero-on-failure gate
  that belongs in the merge pipeline next to lint and typecheck.

## 3. The workflow speclock enables

1. `speclock init` — scaffold a `SPEC.md` template (the human/agent writes intent).
2. `speclock plan` — read `SPEC.md`, extract acceptance criteria, and emit a
   machine-checkable lock file (`specs/*.yaml`). Each criterion has an `id`, a
   `description`, and a link to the test(s) that must exist and pass.
3. `speclock check` — verify every criterion maps to at least one test, run the
   suite, and confirm those tests pass. **Exits non-zero** (CI-gating) otherwise.
4. `speclock status` — print a coverage map:
   - ✅ implemented + tested (≥1 mapped test, all passing)
   - 🚧 test exists but failing/skipped
   - ❌ no mapped test

## 4. Success criteria

speclock succeeds if:

- **S1 — It runs the loop end to end.** A user can go `init → plan → write tests →
  check` and get a meaningful pass/fail on a real project.
- **S2 — It gates CI honestly.** `speclock check` returns a correct non-zero exit
  whenever a criterion is unmapped, untested, or failing — no false greens.
- **S3 — It dogfoods itself.** speclock's own features are tracked as speclock
  criteria, and `speclock check` passes on the speclock repo in CI. (The killer demo.)
- **S4 — It is trustworthy with files.** speclock never writes to a user's source or
  tests. It only reads tests and reads/writes its own `SPEC.md` and `specs/`. Writes
  are explicit and refuse to clobber without `--force`.
- **S5 — It's adoptable in minutes.** `npx speclock init` works; `--help` and the
  empty state are genuinely good; the README makes the "spec-first, not vibe-first"
  case in under a minute.

## 5. Scope

### In scope (v1)
- A single CLI binary: `init`, `plan`, `check`, `status`.
- A SPEC.md format with a documented, stable convention for acceptance criteria.
- A YAML lock format (`specs/*.yaml`) that records criteria and their test mappings.
- Criterion → test mapping by **tag convention** (`[AC-1]` in a test's name) and by
  **explicit test-name substrings** listed in the lock (`tests:`). Either works; the
  resolver unions both.
- A pure, I/O-free core (`src/core`) that is 100% unit-testable.
- A pluggable test-runner adapter interface, with a **Vitest adapter** shipped first.
- Local-only operation: no telemetry, no network calls.

### Out of scope (v1, see roadmap)
- Jest / pytest / go test adapters (the interface is designed for them; not shipped).
- Auto-writing tests, auto-mapping by heuristic/AI, or modifying user code in any way.
- A config-file format beyond what `plan` needs (kept minimal on purpose).
- Watch mode, web UI, hosted dashboards, multi-repo orchestration.
- Coverage of *lines of code* — speclock checks coverage of *criteria*, not lines.

### Non-goals (explicit)
- speclock is **not** a test runner. It orchestrates an existing one via an adapter.
- speclock is **not** a linter or type checker. It sits alongside them in CI.
- speclock does **not** judge whether a test is *good* — only whether it exists,
  maps to a criterion, and passes. Test quality stays a human/agent responsibility.

## 6. Design principles

- **Pure core, thin shell.** All logic (parse, model, resolve, check, format) lives
  in `src/core` with zero process I/O. The CLI layer does fs / child_process / exit.
  Adapters (which must run a test process) live in `src/adapters`, outside the pure core.
- **Read-only on user code; explicit on writes.** Only `init`/`plan` write, and only
  to `SPEC.md` / `specs/`. No overwrite without `--force`. `plan` *merges* to preserve
  hand-edited test mappings across re-runs.
- **Convention over configuration.** The default mapping (`[AC-1]` tag in test names)
  needs zero config and is trivial for an agent to satisfy.
- **Honest exit codes.** `check` is a CI gate; ambiguity resolves to failure.
- **Boring, legible output.** Empty states and `--help` are first-class.

## 7. Milestones

- **M1 — Core.** SPEC.md parser → criteria model → `init` / `plan`. Test fixtures in
  `tests/fixtures/`. CI green (install, typecheck, lint, test).
- **M2 — `check` + Vitest adapter.** Map criteria → tests, run the suite, gate on
  results. Begin self-dogfooding (speclock's own `SPEC.md` + `specs/speclock.yaml`).
- **M3 — `status` + self-gating.** Coverage map command. `speclock check` passes on
  speclock itself, enforced as a CI job. README demo.
- **M4 — Launch polish.** README (one-liner, before/after, install, demo recording
  instructions, why, roadmap), CONTRIBUTING, adapter-authoring docs.

## 8. Key decisions (encoded for review)

- **Language/stack:** TypeScript + Node 20 (CI matrix includes 20 & 22), pnpm,
  `commander` for the CLI, `yaml` for the lock format, Vitest for our own tests.
- **Repo location:** built under `~/speclock` (the invocation dir was `$HOME`, which
  is not empty); pushed to `github.com/aymandakir-gh/speclock`, MIT licensed.
- **Mapping mechanism:** tag-in-test-name (`[AC-1]`) is the primary, zero-friction
  path; explicit `tests:` substrings in the lock are also honored. This keeps the
  lock meaningful (it records criteria + intended mapping) without forcing humans to
  hand-maintain a mapping that drifts.
- **Criterion status semantics:** ✅ requires ≥1 mapped test and *all* mapped tests
  passing; any failing/skipped mapped test → 🚧; zero mapped tests → ❌. `check`
  passes iff every criterion is ✅.
- **Why YAML for the lock:** human-diffable in PRs (the lock is the thing reviewers
  look at), comment-friendly, and trivially machine-readable.

## 9. Risks & mitigations

- **Test-runner output formats drift.** → Isolate parsing in the adapter; depend on
  Vitest's stable JSON reporter; keep `TestRunResult` minimal and version-tolerant.
- **Mapping feels like bureaucracy.** → Default tag convention is one bracketed token
  in a test name; `status` makes the payoff visible immediately.
- **False confidence ("green = correct").** → README is explicit: speclock proves
  *criteria are tested and pass*, not that tests are well-designed. It's a floor.
