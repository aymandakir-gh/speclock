# speclock + Jest example

A minimal, real Jest project gated by speclock. It exists to prove the Jest
adapter end-to-end (and it's exercised both directions in speclock's CI).

```bash
npm install          # installs jest
npx speclock check --runner jest
```

Expected: every criterion in [`SPEC.md`](./SPEC.md) maps to a passing Jest test,
so `speclock check` exits `0`:

```
✅ JD-1  Cart subtotals item prices times quantities (1 test)
✅ JD-2  A valid coupon reduces the order total (1 test)
✅ JD-3  Orders over $50 qualify for free shipping (1 test)

3 criteria  ·  3 ✅ tested  ·  0 🚧 failing  ·  0 ❌ untested
✓ All 3 criteria are implemented and tested.
```

Delete or break a mapped test and `speclock check` exits non-zero — that's the
gate. The lock at [`specs/spec.yaml`](./specs/spec.yaml) is what your reviewers
diff.
