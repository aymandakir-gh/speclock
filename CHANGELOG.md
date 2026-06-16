# Changelog

All notable changes to speclock are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/), and the project aims to follow
[Semantic Versioning](https://semver.org/).

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

[0.1.0]: https://github.com/aymandakir-gh/speclock/releases/tag/v0.1.0
