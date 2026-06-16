# Shopping Cart — Spec (pytest)

> Example project: **speclock gating a real pytest suite.** From this directory,
> run `speclock check --runner pytest` (needs `pytest` installed).

## Overview

A tiny cart library (`cart.py`), specified with speclock and tested with pytest.
Python test names can't carry a `[PY-1]` tag, so each criterion is mapped to its
test by an explicit substring under `tests:` in
[`specs/spec.yaml`](./specs/spec.yaml) — the other half of speclock's resolver.

## Acceptance Criteria

### PY-1: Cart subtotals item prices times quantities

The subtotal multiplies each line item's price by its quantity and sums them;
an empty cart totals zero.

### PY-2: A valid coupon reduces the order total

Known coupon codes (`SAVE10`, `HALF`) discount the total; unknown codes leave it
unchanged.

### PY-3: Orders over $50 qualify for free shipping

Totals of $50 (5000 cents) or more ship free; anything under does not.

## Out of Scope

- Tax, currencies other than USD, and persistence (this is a demo).
