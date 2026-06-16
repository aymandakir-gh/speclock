<!-- Thanks for contributing! speclock dogfoods itself — see CONTRIBUTING.md. -->

## What & why

<!-- What does this change, and what problem does it solve? -->

## Spec-first checklist

- [ ] If this adds/changes a feature, I added or updated a criterion in `SPEC.md`
      and re-ran `pnpm build && node dist/cli/index.js plan`.
- [ ] Each new/changed criterion has a test whose name carries its id (e.g. `[SL-…]`).
- [ ] `pnpm typecheck && pnpm lint && pnpm coverage` pass locally.
- [ ] `pnpm check:self` is green (speclock gates itself).
- [ ] New logic in `src/core` stays pure (no fs/process/child_process).
- [ ] Conventional commit subject (`feat:`, `fix:`, `docs:`, …).

## Notes for reviewers

<!-- Anything tricky, trade-offs, or follow-ups. -->
