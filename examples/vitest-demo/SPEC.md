# Shopping Cart — Spec (Vitest)

> Example project: **speclock gating a real Vitest suite.** From this directory,
> run `speclock check` (Vitest is the default runner).

## Overview

A tiny cart library (`src/cart.ts`), specified with speclock and tested with
Vitest. Each criterion below maps to a Vitest test whose name contains the
criterion id in brackets, e.g. a test named `[VD-1] …` covers criterion `VD-1`.

## Acceptance Criteria

### VD-1: Cart subtotals item prices times quantities

The subtotal multiplies each line item's price by its quantity and sums them;
an empty cart totals zero.

### VD-2: A valid coupon reduces the order total

Known coupon codes (`SAVE10`, `HALF`) discount the total; unknown codes leave it
unchanged.

### VD-3: Orders over $50 qualify for free shipping

Totals of $50 (5000 cents) or more ship free; anything under does not.

## Out of Scope

- Tax, currencies other than USD, and persistence (this is a demo).
