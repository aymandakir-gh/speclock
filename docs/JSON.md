# Machine-readable output (`--json`)

`speclock check --json` and `speclock status --json` print **one JSON object on
stdout** so PR bots, dashboards, and other tooling can consume the result. Human
diagnostics (the `Ran vitest: …` line) stay on **stderr**, and the **exit code is
unchanged** — `check --json` still exits non-zero when the gate fails.

```bash
speclock check --json | jq '.ok, .summary'
```

## Schema

The object is versioned with `schemaVersion`. Within a version, fields may be
added but existing fields keep their meaning.

| Field | Type | Notes |
|-------|------|-------|
| `schemaVersion` | number | Currently `1`. |
| `tool` | string | Always `"speclock"`. |
| `command` | string | `"check"` or `"status"`. |
| `runner` | string | The adapter that ran the suite (`vitest`/`jest`/`pytest`/…). |
| `ok` | boolean | `check`: the gate verdict. `status`: `true` iff every criterion is tested. |
| `summary` | object | `{ total, tested, failing, untested }` counts. |
| `suite` | object | `{ ok, tests, note }` — suite-level result, test count, optional note. |
| `criteria` | array | One entry per criterion (see below). |
| `problems` | string[] | **`check` only** — human-readable reasons the gate failed (`[]` when ok). |

Each `criteria[]` entry:

| Field | Type | Notes |
|-------|------|-------|
| `id` | string | Criterion id, e.g. `"AC-1"`. |
| `description` | string | From the spec. |
| `state` | string | `"tested"` \| `"failing"` \| `"untested"`. |
| `tests` | array | Mapped tests: `{ name, status }` plus optional `file`, `duration` (ms). `status` is `"passed"` \| `"failed"` \| `"skipped"`. |

When coverage can't be computed (no lock files, an invalid lock, an unknown
runner), `--json` still emits valid JSON — an error object — and the usual exit
code `2`:

```json
{ "schemaVersion": 1, "tool": "speclock", "command": "check", "ok": false, "error": "No lock files found in specs/. Run `speclock plan` first." }
```

## Example

```json
{
  "schemaVersion": 1,
  "tool": "speclock",
  "command": "check",
  "runner": "vitest",
  "ok": false,
  "summary": { "total": 2, "tested": 1, "failing": 1, "untested": 0 },
  "suite": { "ok": false, "tests": 2, "note": null },
  "criteria": [
    {
      "id": "AC-1",
      "description": "Users can sign up with an email and password",
      "state": "tested",
      "tests": [{ "name": "[AC-1] rejects short passwords", "status": "passed", "file": "auth.test.ts", "duration": 3 }]
    },
    {
      "id": "AC-2",
      "description": "Users can log out",
      "state": "failing",
      "tests": [{ "name": "[AC-2] invalidates the token", "status": "failed", "file": "auth.test.ts" }]
    }
  ],
  "problems": ["AC-2: mapped test(s) not passing — [AC-2] invalidates the token (failed)"]
}
```
