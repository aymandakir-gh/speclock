# Sample Project Spec

A fixture spec used to exercise `speclock plan` end to end.

## Overview

A tiny "calculator" library used to demonstrate the speclock workflow.

## Acceptance Criteria

### CALC-1: add returns the sum of two numbers

`add(2, 3)` is `5`. Works for negatives and zero.

### CALC-2: divide rejects division by zero

`divide(1, 0)` throws a clear error rather than returning Infinity.

### CALC-3: percent computes a percentage

`percent(50, 200)` is `25` (50 is 25% of 200).

## Out of Scope

- Arbitrary-precision math.
