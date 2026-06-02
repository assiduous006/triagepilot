# Release Verification Checklist

Use this checklist before tagging or announcing a TriagePilot release.

## Repository State

- Confirm the release branch is `main`.
- Confirm the working tree is clean.
- Confirm the release version is reflected in `package.json`.
- Confirm `CHANGELOG.md` describes user-visible changes.
- Confirm `README.md` examples still match the CLI.
- Confirm `SECURITY.md` still describes the current safety model.

## Verification Commands

Run these commands locally:

```bash
pnpm install --frozen-lockfile
pnpm typecheck
pnpm test
pnpm build
node dist/cli.js doctor --config triagepilot.yml
node dist/cli.js issue --input test/fixtures/issues/missing-repro.json --config triagepilot.yml --format markdown
node dist/cli.js pr --diff test/fixtures/diffs/runtime-no-test.diff --config triagepilot.yml --format markdown
```

## GitHub Checks

- Confirm CI passes on `main`.
- Run the report-only workflow in `issue` mode.
- Run the report-only workflow in `pr` mode.
- Confirm both workflow summaries are generated.
- Confirm no workflow requests write permissions.

## Release

- Create or verify the release tag.
- Draft a GitHub release with highlights, verification, and safety notes.
- Publish the release.
- Confirm the public release page is visible.

## After Release

- Update `docs/metrics.md` with the release link.
- Open follow-up issues for any deferred work.
- Record demo workflow run links for future application evidence.
