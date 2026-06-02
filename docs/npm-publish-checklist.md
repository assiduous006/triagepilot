# npm Publish Checklist

Use this checklist before publishing a TriagePilot package to npm.

## Before Publishing

- Confirm `main` is up to date.
- Confirm CI is green on the release commit.
- Run `pnpm install --frozen-lockfile`.
- Run `pnpm typecheck`.
- Run `pnpm test`.
- Run `pnpm build`.
- Run `node dist/cli.js doctor --config triagepilot.yml`.
- Confirm `package.json` version matches the release tag.
- Confirm `README.md`, `CHANGELOG.md`, and `SECURITY.md` are current.
- Confirm the package remains report-only and does not implement GitHub writes.

## Dry Run

```bash
pnpm pack --dry-run
```

Check that the package includes:

- `dist/`
- `README.md`
- `LICENSE`
- `action.yml`

## Publish

Publish only from a clean working tree:

```bash
pnpm publish --access public
```

## After Publishing

- Verify the npm package page.
- Install the package in a temporary directory.
- Run `triagepilot --help`.
- Add the npm package URL to the release notes.
- Update `docs/metrics.md` with download counts once available.
