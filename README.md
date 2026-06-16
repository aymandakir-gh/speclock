# speclock

**Lock the spec. Let the agent build to it. Gate the merge on the spec — not vibes.**

[![CI](https://github.com/aymandakir-gh/speclock/actions/workflows/ci.yml/badge.svg)](https://github.com/aymandakir-gh/speclock/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E%3D20-3c873a.svg)](./package.json)

speclock turns a written spec into a **machine-checkable contract**: it extracts
acceptance criteria from `SPEC.md`, maps each one to the test(s) that prove it,
and fails CI unless every criterion is implemented and tested. It's tooling for
**humans supervising coding agents**.

> As agents write more code faster, the risk isn't code that won't compile — it's
> plausible-looking code that meets no agreed-upon spec. speclock makes the spec
> the thing you merge against.

---

## Spec-first, not vibe-first

**Without speclock** 🫠
You ask an agent for a feature. It writes code and the tests it felt like writing.
The diff looks fine. You merge on vibes. Three commits later, half the brief
quietly never got built — and nothing told you.

**With speclock** 🔒
You write the criteria once. `speclock plan` locks them. The agent builds until
`speclock check` is green. CI refuses the merge until every criterion maps to a
passing test. The spec is the gate.

```
❌ AC-3  Users can log out  (no test)     ← merge blocked, not "looks good to me"
```

---

## Install

`speclock` runs straight from the repo (no global install needed):

```bash
# run any command via npx, e.g. scaffold a spec:
npx github:aymandakir-gh/speclock init
```

Or clone and link for local development:

```bash
git clone https://github.com/aymandakir-gh/speclock
cd speclock && pnpm install && pnpm build
node dist/cli/index.js --help
```

> **Naming note.** The bare npm name `speclock` is already taken by an unrelated
> project, so install via `github:aymandakir-gh/speclock` (above). When published
> to npm this package is `speclock-cli` (the command stays `speclock`). See
> [PRD §8](./PRD.md) for the decision.

---

## Quickstart

```bash
speclock init                 # 1. scaffold SPEC.md
$EDITOR SPEC.md               # 2. write your acceptance criteria
speclock plan                 # 3. lock them into specs/spec.yaml
# 4. write tests whose names include each criterion id, e.g. [AC-1]
speclock check                # 5. gate: passes only when every criterion is tested
speclock status               # (anytime) coverage map, never fails the build
```

### 1. Write criteria in `SPEC.md`

`init` writes a starter template; replace its examples with your own. Acceptance
criteria are `###` headings under `## Acceptance Criteria`, each with a short,
stable id:

```markdown
## Acceptance Criteria

### AC-1: Users can sign up with an email and password
The form rejects invalid emails and passwords shorter than 8 characters.

### AC-2: Users can log out
Logging out invalidates the current session token.
```

### 2. Lock them

```bash
$ speclock plan
✓ Locked 2 criteria → specs/spec.yaml
  +2 added
```

`specs/spec.yaml` is a human-diffable lock — the artifact your reviewers look at:

```yaml
version: 1
spec: SPEC.md
criteria:
  - id: AC-1
    description: Users can sign up with an email and password
    tests: []
  - id: AC-2
    description: Users can log out
    tests: []
```

### 3. Map tests to criteria

Put the criterion id in the test's name. That's the whole convention:

```ts
import { it, expect } from 'vitest';

it('[AC-1] rejects passwords shorter than 8 chars', () => {
  expect(validate('a@b.co', 'short')).toBe(false);
});
```

(Prefer an explicit list? Add test-name substrings under `tests:` in the lock.
The resolver unions both.)

### 4. Gate on it

```bash
$ speclock check
✅ AC-1  Users can sign up with an email and password (1 test)
🚧 AC-2  Users can log out (1 not passing)

2 criteria  ·  1 ✅ tested  ·  1 🚧 failing  ·  0 ❌ untested

✗ speclock check failed:
  • AC-2: mapped test(s) not passing — [AC-2] invalidates the token (failed)
```

`check` exits non-zero, so it gates a merge the moment a criterion is untested,
failing, or the suite is red. Drop it next to lint and typecheck in CI.

---

## speclock checks speclock

The strongest proof: speclock tracks its own features as speclock criteria, and
CI gates speclock on them. Real output from this repo:

```
$ speclock check
Ran vitest: 80 test(s), 10 criteria in 1 spec file(s).
✅ SL-1   `speclock init` scaffolds a SPEC.md template (3 tests)
✅ SL-2   speclock parses a SPEC.md into acceptance criteria (15 tests)
✅ SL-3   `speclock plan` locks criteria into specs/*.yaml (16 tests)
✅ SL-4   the resolver maps criteria to tests (9 tests)
✅ SL-5   `speclock check` gates on the spec (8 tests)
✅ SL-6   a Vitest adapter runs the suite (6 tests)
✅ SL-7   `speclock status` prints a coverage map (4 tests)
✅ SL-8   the core is pure (3 tests)
✅ SL-9   speclock only writes spec and lock files (10 tests)
✅ SL-10  a Jest adapter runs the suite (6 tests)

10 criteria  ·  10 ✅ tested  ·  0 🚧 failing  ·  0 ❌ untested

✓ All 10 criteria are implemented and tested.
```

See [`SPEC.md`](./SPEC.md), the lock at [`specs/spec.yaml`](./specs/spec.yaml),
and the [`self-gate` CI job](./.github/workflows/ci.yml).

---

## How it works

| Command  | What it does |
|----------|--------------|
| `init`   | Writes a `SPEC.md` template. Refuses to overwrite without `--force`. |
| `plan`   | Parses `SPEC.md` → writes/merges `specs/*.yaml`. Re-running preserves your `tests:` mappings, syncs descriptions, drops criteria removed from the spec. |
| `check`  | Runs the suite via an adapter, maps criteria → tests, exits non-zero unless **every** criterion has ≥1 passing test and the suite is green. |
| `status` | Prints the coverage map (✅ / 🚧 / ❌). Informational — never fails the build. |

**Criterion states**

- ✅ **tested** — ≥1 mapped test, all passing.
- 🚧 **failing** — ≥1 mapped test, but one is failing or skipped.
- ❌ **untested** — no test maps to it.

**Architecture.** The core (`src/core`) is pure — SPEC parser, criteria model,
resolver, checker, formatter — with zero filesystem/process I/O, so it's 100%
unit-testable (and a meta-test enforces the purity). The CLI is a thin shell.
Running the test suite is delegated to a **pluggable adapter**; **Vitest and
Jest** ship today (pick with `--runner`). See
[docs/ADAPTERS.md](./docs/ADAPTERS.md) to add pytest, `go test`, or others.

---

## Why it matters

The bottleneck of agentic development is no longer typing speed — it's
**verification**. A human reviewing a flood of agent-written diffs can't hold the
whole brief in their head and check it line by line. speclock externalizes the
brief into criteria and lets a machine confirm the diff actually satisfies them.

It's a floor, not a ceiling: speclock proves your criteria are *tested and
passing*. It doesn't judge whether a test is *good* — that's still on you. But a
green `speclock check` means nobody silently skipped half the spec.

---

## Privacy

Local-only. **No telemetry, no network calls.** speclock is read-only on your
source and tests — the only files it ever writes are `SPEC.md` (`init`) and
`specs/*.yaml` (`plan`), and it refuses to clobber without `--force`.

---

## Roadmap

- [x] `init`, `plan`, `check`, `status`
- [x] Vitest **and Jest** adapters (each with a real example, gated both ways in CI)
- [x] speclock gates itself in CI
- [ ] pytest adapter
- [ ] `speclock check --json` for tooling/PR bots
- [ ] Reusable GitHub Action
- [ ] `go test` adapter
- [ ] Publish to npm registry (pending the naming decision above)

---

## Contributing

Issues and PRs welcome — see [CONTRIBUTING.md](./CONTRIBUTING.md). The fastest way
to understand the project is to read [`SPEC.md`](./SPEC.md): it *is* the feature
list, and `speclock check` keeps it honest.

## License

[MIT](./LICENSE)
