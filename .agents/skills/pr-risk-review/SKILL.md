---
name: pr-risk-review
description: Review a pull request diff for maintainer triage: changed surfaces, risk level, missing tests, release-note needs, and human-review focus areas.
---

## Goal

Produce a PR review aid for maintainers, not a final approval.

## Required output

- Scope summary.
- Risk level: low / medium / high.
- Compatibility concerns.
- Missing or weak tests.
- Docs or release-note follow-up.
- Human review focus.
- Evidence from changed files and diff.

## Rules

- Prefer concrete evidence over generic advice.
- Do not ask for broad rewrites unless a specific risk is shown.
- Keep output brief enough to fit in a GitHub PR comment.
