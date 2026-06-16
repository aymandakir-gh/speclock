# speclock + pytest example

A minimal, real pytest project gated by speclock. It proves the pytest adapter
end-to-end (and is exercised both directions in speclock's CI).

```bash
pip install pytest
npx speclock check --runner pytest
```

Because Python identifiers can't contain a `[PY-1]` tag, this example maps each
criterion to its test with an explicit substring under `tests:` in
[`specs/spec.yaml`](./specs/spec.yaml):

```yaml
- id: PY-1
  description: Cart subtotals item prices times quantities
  tests:
    - test_subtotal_sums_line_items
```

`speclock check --runner pytest` exits `0` while every mapped test passes, and
non-zero the moment one is deleted or made to fail.

> Using a non-standard pytest launcher? Set `SPECLOCK_PYTEST`, e.g.
> `SPECLOCK_PYTEST="python -m pytest" speclock check --runner pytest`.
