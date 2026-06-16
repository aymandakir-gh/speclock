# speclock + Vitest example

A minimal, real Vitest project gated by speclock. It proves the (default) Vitest
adapter end-to-end (and is exercised both directions in speclock's CI).

```bash
npm install          # installs vitest
npx speclock check   # vitest is the default runner
```

Every criterion in [`SPEC.md`](./SPEC.md) maps to a passing Vitest test, so
`speclock check` exits `0`. Delete or break a mapped test and it exits non-zero —
that's the gate. The lock at [`specs/spec.yaml`](./specs/spec.yaml) is what your
reviewers diff.
