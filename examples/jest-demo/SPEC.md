# Shopping Cart — Spec

> Example project: **speclock gating a real Jest suite.** From this directory,
> run `speclock check --runner jest` (after `npm install`).

## Overview

A tiny cart library (`src/cart.js`), specified with speclock and tested with
Jest. Each criterion below maps to a Jest test whose name contains the criterion
id in brackets, e.g. a test named `[JD-1] …` covers criterion `JD-1`.

## Acceptance Criteria

### JD-1: Cart subtotals item prices times quantities

The subtotal multiplies each line item's price by its quantity and sums them;
an empty cart totals zero.

### JD-2: A valid coupon reduces the order total

Known coupon codes (`SAVE10`, `HALF`) discount the total; unknown codes leave it
unchanged.

### JD-3: Orders over $50 qualify for free shipping

Totals of $50 (5000 cents) or more ship free; anything under does not.

## Out of Scope

- Tax, currencies other than USD, and persistence (this is a demo).
