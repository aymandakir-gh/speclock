# Pre-1.0 adversarial review

Before tagging `v1.0.0`, speclock was put through a multi-agent adversarial
review: six independent reviewers (one per lens — core correctness, adapters,
write-safety, CLI/JSON/UX, test integrity, packaging/CI/action) surfaced
candidate findings, and each finding was then re-checked by a separate skeptic
agent prompted to refute it. **12 findings were raised; all 12 were confirmed
against the source; 0 were declined.** Every one is fixed below, each with a
regression test.

| # | Sev | Area | Finding | Fix | Regression test |
|---|-----|------|---------|-----|-----------------|
| 1 | high | `src/core/spec-parser.ts` | A closing code fence carrying an info string (```` ```bash ```` inside an open ```` ```ts ````) desynced fence tracking — dropping a real criterion and fabricating a fenced one (a false-green). | Separate open vs close fences; a close may carry only trailing whitespace. | `spec-parser.test.ts` "fence-with-info-string does not desync" |
| 2 | med | `src/core/spec-parser.ts` | `### AC-1:` (explicit id, empty description) silently became id `ac-1` + description `"AC-1:"`, breaking the author's `[AC-1]` tags. | Detect `id:` with no description and throw `SpecParseError`. | `spec-parser.test.ts` "throws on an explicit-id heading with no description" |
| 3 | high | `src/adapters/pytest.ts` | An interrupted/errored pytest run (exit 2/3) still writes a partial JUnit report whose collected tests passed → reported as a green suite (false PASS). | Trust the report only on exit 0/1/5; otherwise force `ok:false` with a note. | `pytest.test.ts` "does not report a green suite when pytest is interrupted" |
| 4 | med | `src/adapters/spawn.ts` | On Windows the runner is a `.cmd`; spawning it without a shell throws EINVAL since Node's CVE-2024-27980 fix (all supported Node ≥20). | `shell: true` on win32 only. | covered by `run-json.test.ts`/`spawnProcess` smoke + code review (not runnable on Linux CI) |
| 5 | high | `src/cli/safe-write.ts` | The lexical write guards could be defeated by symlinks — a `SPEC.md`/`specs/` entry pointing at a source file or external dir let `init`/`plan` clobber/escape (defeats SL-9). | New `assertWritableTarget`: refuse a symlinked final component; canonicalize the nearest existing ancestor and re-check containment (`init`/`plan` call it before writing). | `symlink-safety.test.ts` (3 cases) |
| 6 | med | `src/core/formatter.ts` | `status --json` `ok` folded in suite-level `run.ok`, contradicting the documented "true iff every criterion is tested". | Base `ok` is coverage-only; `check` overrides with its gate verdict. | `formatter-json.test.ts` "ok reflects coverage only … even if the suite is red" |
| 7 | low | `src/cli/ui.ts` | `NO_COLOR=""` (empty) did not disable color (spec says presence, any value). | Test presence (`=== undefined`) not non-null. | `color.test.ts` "disables … including empty string" |
| 8 | med | `tests/core/formatter-color.test.ts` | SL-19's "disables cleanly (NO_COLOR / non-TTY)" half was untested — only the injection seam. | Extract pure `shouldEnableColor`/`buildPalette`; test the decision + ANSI/identity. | `color.test.ts` (new) |
| 9 | low | `tests/action.test.ts` | SL-15 didn't assert the run step wires `working-directory`. | Assert `runStep['working-directory']`. | `action.test.ts` (updated) |
| 10 | low | `tests/cli/init.test.ts` | SL-1 `--force` test checked only the exit code, not that the file was rewritten. | Sentinel content + assert it was replaced. | `init.test.ts` (updated) |
| 11 | high | `src/adapters/run-json.ts` | Vitest on an empty/zero-match suite exits 0 with no report → adapter threw → exit 2 (config error) on the documented first-run path, instead of reporting untested criteria (exit 1). | Treat clean-exit-with-no-report as an empty suite. | `run-json.test.ts` "treats a clean exit (0) with no report as an empty suite" |
| 12 | med | `scripts/verify-example.mjs` | The "deleted" direction asserted `!= 0`, so it passed on the vitest exit-2 crash (#11) instead of the real gate — the both-direction CI proof was hollow for the default adapter. | Assert the exact gate code `=== 1`. | the CI `examples` job itself (now fails on any non-gate exit) |

Declined: **none.**
