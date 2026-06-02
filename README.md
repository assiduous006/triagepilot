# TriagePilot

Evidence-based issue and PR triage for open-source maintainers.

TriagePilot is a safe-by-default CLI and GitHub Action that helps maintainers
classify issues, find missing reproduction details, suggest labels, draft a
polite maintainer reply, and summarize PR review risk using repo-local rules.

It is report-only by default. It does not post comments, apply labels, create
tags, merge pull requests, or require write permissions.

## Quickstart

```bash
pnpm install
pnpm build
node dist/cli.js issue --input test/fixtures/issues/missing-repro.json --config triagepilot.yml --format markdown
node dist/cli.js pr --base main --head HEAD --config triagepilot.yml --format markdown
```

During local development:

```bash
pnpm dev issue --input test/fixtures/issues/missing-repro.json --config triagepilot.yml --format markdown
pnpm dev doctor --config triagepilot.yml
```

## CLI

```bash
triagepilot issue --input <json> --config triagepilot.yml --format markdown
triagepilot issue --input <json> --config triagepilot.yml --format json
triagepilot pr --base <ref> --head <ref> --config triagepilot.yml --format markdown
triagepilot doctor --config triagepilot.yml
```

Issue reports include:

- Issue type and severity.
- Missing information.
- Suggested labels.
- Maintainer reply draft.
- Confidence and evidence.

PR reports include:

- Changed surfaces.
- Risk level.
- Missing tests.
- Release-note signal.
- Review checklist.
- Evidence from changed files.

## GitHub Action

Use report-only mode first:

```yaml
name: TriagePilot report-only
on:
  workflow_dispatch:
    inputs:
      mode:
        type: choice
        options: [issue, pr]
        default: pr

jobs:
  triagepilot:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      issues: read
      pull-requests: read
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v5
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - run: node dist/cli.js pr --base origin/main --head HEAD --config triagepilot.yml --format markdown >> "$GITHUB_STEP_SUMMARY"
```

## Safety Model

- Public issue bodies, PR descriptions, commit messages, and diffs are untrusted.
- HTML comments, control characters, zero-width characters, and prompt-injection
  phrases are stripped or flagged before analysis.
- Inputs are truncated according to `safety.max_input_chars`.
- Model integration is intentionally stubbed behind an interface for v0.1.0.
- No GitHub writes are implemented in the MVP.
- Any future comment or label write must require explicit maintainer opt-in and
  trusted triggers.

## Configuration

See [triagepilot.yml](triagepilot.yml) for the default policy. The config defines
labels, required issue fields, supported versions, and PR file patterns.

## Roadmap

- v0.1.0: Offline deterministic CLI, fixtures, tests, report-only workflow.
- v0.2.0: Optional model adapter with strict JSON schemas and safe fallback.
- v0.3.0: Maintainer dashboard and pilot repo metrics.

## Open Source Maintainer Evidence

The repository should collect public evidence before any Codex for Open Source
application:

- Tagged release.
- CI passing.
- Demo issue and PR reports.
- Public issues and PRs showing active maintenance.
- External dry-run pilot repos or public maintainer feedback.
