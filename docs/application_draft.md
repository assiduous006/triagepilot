# TriagePilot Codex for Open Source Application Draft

Replace placeholders with real public numbers before submitting.

## Describe your role

Primary maintainer. I created TriagePilot, manage roadmap/issues/releases,
review PRs, maintain the GitHub Action/CLI, write docs, triage maintainer
feedback, and handle security reports.

## Why does this repository qualify? <= 500 characters

TriagePilot helps OSS maintainers triage issues and review PRs with repo-local
rules, evidence, and safe report-only defaults. It has [X] stars, [Y] npm
downloads/month, [Z] GitHub Action runs, and pilots in [N] public repos. It
directly reduces repetitive issue triage, PR review prep, and maintainer reply
drafting.

## How will you use API credits? <= 500 characters

We will use credits for report-only maintainer workflows: issue triage, PR risk
summaries, duplicate/repro checks, and release-note/test recommendations. Runs
are limited by trusted triggers, input truncation, and JSON schemas. Credits
will support public OSS repos piloting TriagePilot without each maintainer
paying API costs.

## Anything else? <= 500 characters

The project is built around safe OSS maintenance: read-only by default, no public
comments or labels unless enabled, sanitized untrusted issue/PR text, minimal
GitHub permissions, and documented prompt-injection safeguards. We dogfood it on
its own repo and publish workflows, metrics, and security notes.
