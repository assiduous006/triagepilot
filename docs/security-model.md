# Security Model

TriagePilot v0.1.0 is intentionally conservative.

## Defaults

- Report-only.
- Read-only GitHub permissions.
- No public comments.
- No label writes.
- No GitHub token logging.
- No model call unless a future adapter is explicitly configured.

## Untrusted input

The following inputs are treated as untrusted:

- Issue title and body.
- PR descriptions.
- Commit messages.
- Diff text.
- Changelog text.
- Comments.

TriagePilot strips HTML comments, zero-width characters, and control characters.
It flags prompt-injection phrases and truncates oversized input.

## Future write support

Any future write-capable mode must require:

- Explicit maintainer opt-in.
- Trusted trigger.
- Tests for unsafe public fork scenarios.
- Minimal GitHub permissions.
- Clear docs explaining the risk.
