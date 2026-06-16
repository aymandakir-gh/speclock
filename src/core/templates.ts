/**
 * Static text templates. Pure: these are just strings.
 */

/** The SPEC.md scaffold written by `speclock init`. */
export const SPEC_TEMPLATE = `# Project Spec

> Written by a human (or an agent) to capture *intent* before code exists.
> Lock it with \`speclock plan\`, build to it, and gate merges with \`speclock check\`.

## Overview

One or two sentences: what is this, who is it for, and what does success look like?

## Acceptance Criteria

List each criterion as a level-3 heading. Give it a short, stable id followed by
a colon, then a one-line description. Add detail underneath if useful.

A criterion is "done" when at least one test maps to it and that test passes. Tests
map to a criterion when their name contains the id in brackets, e.g. a test named
\`it('[AC-1] accepts a valid email', ...)\` covers criterion \`AC-1\`.

### AC-1: Users can sign up with an email and password

The form rejects invalid emails and passwords shorter than 8 characters.

### AC-2: Users can log in and receive a session

A valid email/password returns a session token; bad credentials return 401.

### AC-3: Users can log out

Logging out invalidates the current session token.

## Out of Scope

Anything below here is ignored by speclock — use it to record explicit non-goals.

- Social login (later).
- Password reset flows (later).
`;

/** Printed by `speclock init` after writing the scaffold. */
export const INIT_NEXT_STEPS = `Next:
  1. Edit SPEC.md — replace the example criteria with your own.
  2. Run \`speclock plan\` to lock them into specs/spec.yaml.
  3. Write tests whose names include each criterion id, e.g. [AC-1].
  4. Run \`speclock check\` to gate on the spec.`;
