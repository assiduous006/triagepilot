# Demo

## Issue triage

```bash
pnpm dev issue --input test/fixtures/issues/missing-repro.json --config triagepilot.yml --format markdown
```

Expected highlights:

- Type: bug.
- Missing info: reproduction steps, expected behavior, actual behavior, logs or screenshots.
- Suggested labels: bug, needs-repro, needs-info.
- Maintainer reply: polite and specific.
- Evidence: missing fields and issue snippets.

## PR review

```bash
pnpm dev pr --diff test/fixtures/diffs/runtime-no-test.diff --config triagepilot.yml --format markdown
```

Expected highlights:

- Changed surfaces: runtime.
- Risk: high or medium depending on configured public API patterns.
- Missing tests: true.
- Release note needed: true.
- Human review focus: API and behavior changes.

## Safety defaults

The GitHub Action writes to Step Summary by default. It does not post comments,
apply labels, request write permissions, or expose secrets.
